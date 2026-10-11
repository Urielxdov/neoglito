/** Lectura perezosa del entorno: los .env se cargan después de importar módulos. */
export const isTelemetryEnabled = (): boolean =>
  process.env.TELEMETRY_ENABLED !== 'false';

export const telemetrySystemToken = (): string | undefined =>
  process.env.TELEMETRY_SYSTEM_TOKEN || undefined;

/** Endpoint OTLP/HTTP del collector visto desde los contenedores desplegados. */
export const deploymentCollectorEndpoint = (): string =>
  process.env.TELEMETRY_DEPLOYMENT_COLLECTOR_ENDPOINT ||
  'http://host.docker.internal:4318';

export const telemetryRetentionDays = (): number => {
  const days = Number(process.env.TELEMETRY_RETENTION_DAYS ?? 7);
  return Number.isFinite(days) && days >= 0 ? days : 7;
};

/** false = solo variables OTEL_*, sin montar agentes de lenguaje en los contenedores. */
export const isAutoInstrumentationEnabled = (): boolean =>
  process.env.TELEMETRY_AUTO_INSTRUMENTATION !== 'false';
