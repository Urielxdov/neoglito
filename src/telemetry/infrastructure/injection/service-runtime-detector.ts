import { access, readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import {
  lookupImage,
  normalizeImageRef,
} from '../../../deployment/domain/services/service-image-catalog.js';
import { isRecord } from '../../../shared/application/compose-ports.js';
import { ServiceRuntime } from '../../domain/value-objects/service-runtime.js';

export interface ServiceInspection {
  /** false para bases de datos, brokers, proxies y otras imágenes conocidas. */
  readonly instrumentable: boolean;
  readonly runtime: ServiceRuntime;
  /** Base Alpine: el agente de Python necesita su variante musl. */
  readonly musl: boolean;
}

const NOT_INSTRUMENTABLE: ServiceInspection = {
  instrumentable: false,
  runtime: ServiceRuntime.UNKNOWN,
  musl: false,
};

const RUNTIME_IMAGES: ReadonlyArray<readonly [RegExp, ServiceRuntime]> = [
  [/^(?:node|bitnami\/node)$/, ServiceRuntime.NODE],
  [/^(?:python|pypy|bitnami\/python)$/, ServiceRuntime.PYTHON],
  [
    /^(?:eclipse-temurin|openjdk|amazoncorretto|ibm-semeru-runtimes|maven|gradle|tomcat|bellsoft\/liberica.*|azul\/zulu-openjdk.*)$/,
    ServiceRuntime.JAVA,
  ],
];

const MARKERS: ReadonlyArray<readonly [readonly string[], ServiceRuntime]> = [
  [['package.json'], ServiceRuntime.NODE],
  [
    ['requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py'],
    ServiceRuntime.PYTHON,
  ],
  [['pom.xml', 'build.gradle', 'build.gradle.kts'], ServiceRuntime.JAVA],
];

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

function runtimeOfImage(ref: string): ServiceRuntime {
  const name = normalizeImageRef(ref);
  return (
    RUNTIME_IMAGES.find(([pattern]) => pattern.test(name))?.[1] ??
    ServiceRuntime.UNKNOWN
  );
}

/** Imagen de la última etapa `FROM` (la que se ejecuta), o null si usa ARG. */
export function finalStageImage(dockerfile: string): string | null {
  let image: string | null = null;
  for (const line of dockerfile.split(/\r?\n/)) {
    const match = /^\s*FROM\s+(?:--\S+\s+)*(\S+)/i.exec(line);
    if (match) image = match[1];
  }
  return image && !image.includes('$') ? image : null;
}

async function inspectBuild(
  build: unknown,
  projectDirectory: string,
): Promise<ServiceInspection> {
  const context =
    typeof build === 'string'
      ? build
      : isRecord(build) && typeof build.context === 'string'
        ? build.context
        : '.';
  // Contextos remotos (git, URL) no se pueden inspeccionar.
  if (/^(?:[a-z][a-z0-9+.-]*:\/\/|git@)/i.test(context))
    return { ...NOT_INSTRUMENTABLE, instrumentable: true };

  const contextDirectory = isAbsolute(context)
    ? context
    : resolve(projectDirectory, context);
  const dockerfile =
    isRecord(build) && typeof build.dockerfile === 'string'
      ? build.dockerfile
      : 'Dockerfile';

  let base: string | null = null;
  try {
    base = finalStageImage(
      await readFile(resolve(contextDirectory, dockerfile), 'utf8'),
    );
  } catch {
    // Sin Dockerfile legible se decide solo por los archivos del contexto.
  }
  const musl = base?.toLowerCase().includes('alpine') ?? false;
  if (base) {
    // Un proxy o base de datos en la etapa final no es instrumentable.
    if (lookupImage(base)) return NOT_INSTRUMENTABLE;
    const runtime = runtimeOfImage(base);
    if (runtime !== ServiceRuntime.UNKNOWN)
      return { instrumentable: true, runtime, musl };
  }

  const found = new Set<ServiceRuntime>();
  for (const [files, runtime] of MARKERS) {
    for (const file of files) {
      if (await exists(join(contextDirectory, file))) found.add(runtime);
    }
  }
  // Varios lenguajes en el contexto = ambiguo: nunca se adivina un agente.
  const [only] = found.size === 1 ? found : [ServiceRuntime.UNKNOWN];
  return { instrumentable: true, runtime: only, musl };
}

/** Decide si un servicio recibe telemetría y con qué agente de lenguaje. */
export async function detectServiceRuntime(
  service: Record<string, unknown>,
  projectDirectory: string,
): Promise<ServiceInspection> {
  if (service.build !== undefined)
    return inspectBuild(service.build, projectDirectory);

  if (typeof service.image !== 'string')
    return { ...NOT_INSTRUMENTABLE, instrumentable: true };
  if (lookupImage(service.image)) return NOT_INSTRUMENTABLE;
  return {
    instrumentable: true,
    runtime: runtimeOfImage(service.image),
    musl: service.image.toLowerCase().includes('alpine'),
  };
}
