import { ServiceRuntime } from '../../domain/value-objects/service-runtime.js';

export type AgentVariant = 'nodejs' | 'java' | 'python' | 'python-musl';

export interface AgentEnvironmentVariable {
  readonly key: string;
  readonly value: string;
  /** Si la variable ya existe se anexa con este separador en vez de omitirla. */
  readonly mergeWith?: ' ' | ':';
}

export interface AutoInstrumentationAgent {
  readonly variant: AgentVariant;
  readonly image: string;
  /** Ruta donde el volumen compartido se monta en el servicio y en el init. */
  readonly mountPath: string;
  /** Comando del servicio init: copia el agente al volumen compartido. */
  readonly copyCommand: readonly string[];
  readonly environment: readonly AgentEnvironmentVariable[];
}

/**
 * Imágenes de auto-instrumentación del OpenTelemetry Operator
 * (ghcr.io/open-telemetry/opentelemetry-operator). Los tags están fijados y se
 * pueden sobreescribir con TELEMETRY_AUTOINSTRUMENTATION_<VARIANTE>_IMAGE.
 */
const REGISTRY = 'ghcr.io/open-telemetry/opentelemetry-operator';
const DEFAULT_IMAGES: Record<'nodejs' | 'java' | 'python', string> = {
  nodejs: `${REGISTRY}/autoinstrumentation-nodejs:0.78.0`,
  java: `${REGISTRY}/autoinstrumentation-java:2.32.0`,
  python: `${REGISTRY}/autoinstrumentation-python:0.66b1`,
};

const imageFor = (variant: 'nodejs' | 'java' | 'python'): string =>
  process.env[`TELEMETRY_AUTOINSTRUMENTATION_${variant.toUpperCase()}_IMAGE`] ||
  DEFAULT_IMAGES[variant];

const mountPathFor = (variant: AgentVariant) =>
  `/otel-auto-instrumentation-${variant === 'python-musl' ? 'python' : variant}`;

/** null cuando el runtime no tiene agente (solo se inyectan variables OTEL_*). */
export function autoInstrumentationFor(
  runtime: ServiceRuntime,
  musl: boolean,
): AutoInstrumentationAgent | null {
  switch (runtime) {
    case ServiceRuntime.NODE: {
      const mountPath = mountPathFor('nodejs');
      return {
        variant: 'nodejs',
        image: imageFor('nodejs'),
        mountPath,
        copyCommand: ['cp', '-r', '/autoinstrumentation/.', mountPath],
        environment: [
          {
            key: 'NODE_OPTIONS',
            value: `--require ${mountPath}/autoinstrumentation.js`,
            mergeWith: ' ',
          },
        ],
      };
    }
    case ServiceRuntime.JAVA: {
      const mountPath = mountPathFor('java');
      return {
        variant: 'java',
        image: imageFor('java'),
        mountPath,
        copyCommand: ['cp', '/javaagent.jar', `${mountPath}/javaagent.jar`],
        environment: [
          {
            key: 'JAVA_TOOL_OPTIONS',
            value: `-javaagent:${mountPath}/javaagent.jar`,
            mergeWith: ' ',
          },
        ],
      };
    }
    case ServiceRuntime.PYTHON: {
      const variant: AgentVariant = musl ? 'python-musl' : 'python';
      const mountPath = mountPathFor(variant);
      return {
        variant,
        image: imageFor('python'),
        mountPath,
        // La imagen trae un árbol separado para libc musl (Alpine).
        copyCommand: [
          'cp',
          '-r',
          musl ? '/autoinstrumentation-musl/.' : '/autoinstrumentation/.',
          mountPath,
        ],
        environment: [
          {
            key: 'PYTHONPATH',
            value: `${mountPath}/opentelemetry/instrumentation/auto_instrumentation:${mountPath}`,
            mergeWith: ':',
          },
          {
            key: 'OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED',
            value: 'true',
          },
        ],
      };
    }
    default:
      return null;
  }
}
