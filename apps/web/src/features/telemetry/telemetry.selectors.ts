import type {
  TelemetryLogResponse,
  TelemetryMetricPointResponse,
  TelemetrySpanResponse,
} from '@neoglito/web/shared/api/contracts';
import type { Trace } from '@neoglito/web/features/telemetry/trace-assembly';

export const LOG_LEVELS = [
  { key: null, label: 'Todos' },
  { key: 'DEBUG', label: 'Debug' },
  { key: 'INFO', label: 'Info' },
  { key: 'WARN', label: 'Warn' },
  { key: 'ERROR', label: 'Error' },
] as const;

/** Agrupa TRACE con DEBUG y FATAL con ERROR para no perder niveles en el filtro. */
export function matchesLogLevel(severity: string, level: string | null) {
  if (level === null) return true;
  if (level === 'DEBUG') return severity === 'DEBUG' || severity === 'TRACE';
  if (level === 'ERROR') return severity === 'ERROR' || severity === 'FATAL';
  return severity === level;
}

export function selectServiceNames(
  spans: TelemetrySpanResponse[],
  logs: TelemetryLogResponse[],
  metrics: TelemetryMetricPointResponse[],
): string[] {
  const names = new Set<string>();
  for (const span of spans) names.add(span.serviceName);
  for (const log of logs) names.add(log.serviceName);
  for (const point of metrics) names.add(point.serviceName);
  return [...names];
}

/** Una traza pertenece a un servicio si alguno de sus spans lo atraviesa. */
export function selectVisibleTraces(traces: Trace[], service: string | null) {
  return service
    ? traces.filter((trace) => trace.services.includes(service))
    : traces;
}

/** Sin selección explícita (o si ya salió del rango) se muestra la primera con error. */
export function selectActiveTrace(
  traces: Trace[],
  selectedTraceId: string | null,
): Trace | null {
  return (
    traces.find((trace) => trace.id === selectedTraceId) ??
    traces.find((trace) => trace.hasError) ??
    traces[0] ??
    null
  );
}

export function selectLogsOfService(
  logs: TelemetryLogResponse[],
  service: string | null,
) {
  return service ? logs.filter((log) => log.serviceName === service) : logs;
}
