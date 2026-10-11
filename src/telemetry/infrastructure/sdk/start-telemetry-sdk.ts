import { register } from 'node:module';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import {
  isTelemetryEnabled,
  telemetrySystemToken,
} from '../../application/telemetry-config.js';

/** Ruta del receptor: la API no debe generar telemetría por recibir telemetría. */
export const INGEST_PATH_PREFIX = '/telemetry/ingest';

const METRIC_EXPORT_INTERVAL_MS = 30_000;

export interface TelemetrySdkHandle {
  shutdown(): Promise<void>;
}

/**
 * Arranca el SDK de OpenTelemetry de la propia API. Debe invocarse antes de
 * importar AppModule para que las instrumentaciones parcheen las librerías.
 * Devuelve null si la telemetría está desactivada o falta configuración.
 */
export function startTelemetrySdk(): TelemetrySdkHandle | null {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/+$/, '');
  const token = telemetrySystemToken();
  if (!isTelemetryEnabled() || !endpoint || !token) return null;

  // Hook de carga ESM: sin él las dependencias importadas con `import` no se instrumentan.
  register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

  const headers = { authorization: `Bearer ${token}` };
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'neoglito-api',
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
      headers,
    }),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${endpoint}/v1/metrics`,
          headers,
        }),
        exportIntervalMillis: METRIC_EXPORT_INTERVAL_MS,
      }),
    ],
    logRecordProcessors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: `${endpoint}/v1/logs`, headers }),
      }),
    ],
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (request) =>
          request.url?.startsWith(INGEST_PATH_PREFIX) ?? false,
      }),
      new ExpressInstrumentation(),
      new NestInstrumentation(),
      new PgInstrumentation(),
      new RedisInstrumentation(),
    ],
  });
  sdk.start();

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      // Vacía los lotes pendientes y vuelve a emitir la señal con su comportamiento por defecto.
      void sdk
        .shutdown()
        .catch(() => undefined)
        .finally(() => process.kill(process.pid, signal));
    });
  }
  return { shutdown: () => sdk.shutdown() };
}
