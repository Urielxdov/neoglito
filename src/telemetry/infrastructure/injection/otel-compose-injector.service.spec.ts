import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OtelComposeInjector } from './otel-compose-injector.service.js';

let directory: string;
const injector = new OtelComposeInjector();
const context = () => ({
  deploymentId: 'dep-1',
  projectId: 7,
  token: 'ngt_secret',
  projectDirectory: directory,
});

type Doc = Record<string, any>;

async function app(name: string, files: Record<string, string>) {
  await mkdir(join(directory, name), { recursive: true });
  for (const [file, content] of Object.entries(files))
    await writeFile(join(directory, name, file), content);
}

beforeEach(async () => {
  vi.stubEnv(
    'TELEMETRY_DEPLOYMENT_COLLECTOR_ENDPOINT',
    'http://collector:4318',
  );
  directory = await mkdtemp(join(tmpdir(), 'neoglito-injector-'));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe('OtelComposeInjector', () => {
  it('inyecta variables OTEL_* y extra_hosts sin pisar las existentes', async () => {
    const document: Doc = {
      services: {
        worker: {
          image: 'custom/worker',
          environment: [
            'OTEL_SERVICE_NAME=mi-worker',
            'OTEL_RESOURCE_ATTRIBUTES=team=a',
            'FROM_HOST',
          ],
        },
      },
    };
    await injector.inject(document, context());
    const worker = document.services.worker;
    expect(worker.environment).toMatchObject({
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://collector:4318',
      OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
      OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Bearer%20ngt_secret',
      OTEL_SERVICE_NAME: 'mi-worker',
      OTEL_RESOURCE_ATTRIBUTES:
        'team=a,neoglito.deployment.id=dep-1,neoglito.project.id=7',
      OTEL_TRACES_EXPORTER: 'otlp',
      OTEL_METRICS_EXPORTER: 'otlp',
      OTEL_LOGS_EXPORTER: 'otlp',
      FROM_HOST: null,
    });
    expect(worker.extra_hosts).toEqual(['host.docker.internal:host-gateway']);
    // Sin lenguaje detectado no hay agente ni servicios auxiliares.
    expect(Object.keys(document.services)).toEqual(['worker']);
    expect(document.volumes).toBeUndefined();
  });

  it('omite bases de datos, caches y proxies', async () => {
    const document: Doc = {
      services: {
        db: { image: 'postgres:16' },
        cache: { image: 'redis:8-alpine' },
        proxy: { image: 'nginx:latest' },
      },
    };
    await injector.inject(document, context());
    for (const service of Object.values<Doc>(document.services)) {
      expect(service.environment).toBeUndefined();
      expect(service.extra_hosts).toBeUndefined();
    }
  });

  it('monta el agente de Node con un servicio init y anexa NODE_OPTIONS', async () => {
    await app('api', {
      'package.json': '{}',
      Dockerfile: 'FROM node:22-alpine\nCMD ["node","index.js"]\n',
    });
    const document: Doc = {
      services: {
        api: {
          build: { context: './api' },
          volumes: ['./data:/data'],
          depends_on: ['db'],
          environment: { NODE_OPTIONS: '--max-old-space-size=512' },
        },
        db: { image: 'postgres:16' },
      },
      volumes: { data: {} },
    };
    await injector.inject(document, context());

    const api = document.services.api;
    expect(api.environment.NODE_OPTIONS).toBe(
      '--max-old-space-size=512 --require /otel-auto-instrumentation-nodejs/autoinstrumentation.js',
    );
    expect(api.volumes).toEqual([
      './data:/data',
      'neoglito-otel-nodejs:/otel-auto-instrumentation-nodejs:ro',
    ]);
    expect(api.depends_on).toEqual({
      db: { condition: 'service_started' },
      'neoglito-otel-init-nodejs': {
        condition: 'service_completed_successfully',
      },
    });
    expect(document.services['neoglito-otel-init-nodejs']).toMatchObject({
      user: '0',
      command: [
        'cp',
        '-r',
        '/autoinstrumentation/.',
        '/otel-auto-instrumentation-nodejs',
      ],
      volumes: ['neoglito-otel-nodejs:/otel-auto-instrumentation-nodejs'],
      restart: 'no',
    });
    expect(document.volumes).toEqual({
      data: {},
      'neoglito-otel-nodejs': {},
    });
  });

  it('usa el árbol musl de Python para bases Alpine y un init compartido', async () => {
    await app('svc-a', {
      'requirements.txt': 'flask',
      Dockerfile: 'FROM python:3.12-alpine\n',
    });
    await app('svc-b', {
      'pyproject.toml': '',
      Dockerfile: 'FROM python:3.12-alpine\n',
    });
    const document: Doc = {
      services: {
        a: { build: './svc-a' },
        b: { build: './svc-b' },
      },
    };
    await injector.inject(document, context());
    const inits = Object.keys(document.services).filter((name) =>
      name.startsWith('neoglito-otel-init-'),
    );
    expect(inits).toEqual(['neoglito-otel-init-python-musl']);
    expect(document.services[inits[0]].command[2]).toBe(
      '/autoinstrumentation-musl/.',
    );
    expect(document.services.a.environment.PYTHONPATH).toContain(
      '/auto_instrumentation:',
    );
    expect(document.services.b.depends_on).toEqual({
      'neoglito-otel-init-python-musl': {
        condition: 'service_completed_successfully',
      },
    });
  });

  it('usa -javaagent para servicios Java detectados por imagen', async () => {
    const document: Doc = {
      services: { svc: { image: 'eclipse-temurin:21-jre' } },
    };
    await injector.inject(document, context());
    expect(document.services.svc.environment.JAVA_TOOL_OPTIONS).toBe(
      '-javaagent:/otel-auto-instrumentation-java/javaagent.jar',
    );
    expect(document.services['neoglito-otel-init-java'].command).toEqual([
      'cp',
      '/javaagent.jar',
      '/otel-auto-instrumentation-java/javaagent.jar',
    ]);
  });

  it('no monta agentes si TELEMETRY_AUTO_INSTRUMENTATION=false', async () => {
    vi.stubEnv('TELEMETRY_AUTO_INSTRUMENTATION', 'false');
    const document: Doc = {
      services: { svc: { image: 'eclipse-temurin:21-jre' } },
    };
    await injector.inject(document, context());
    expect(Object.keys(document.services)).toEqual(['svc']);
    expect(document.services.svc.environment.OTEL_SERVICE_NAME).toBe('svc');
    expect(document.services.svc.environment.JAVA_TOOL_OPTIONS).toBeUndefined();
  });

  it('respeta extra_hosts existentes y no duplica host.docker.internal', async () => {
    const document: Doc = {
      services: {
        a: {
          image: 'custom/a',
          extra_hosts: ['host.docker.internal:10.0.0.1'],
        },
        b: { image: 'custom/b', extra_hosts: { other: '1.2.3.4' } },
      },
    };
    await injector.inject(document, context());
    expect(document.services.a.extra_hosts).toEqual([
      'host.docker.internal:10.0.0.1',
    ]);
    expect(document.services.b.extra_hosts).toEqual({
      other: '1.2.3.4',
      'host.docker.internal': 'host-gateway',
    });
  });
});
