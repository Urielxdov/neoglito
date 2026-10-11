import type { TelemetryJsonValue } from '@neoglito/web/shared/api/contracts';

const SPAN_KINDS = [
  'UNSPECIFIED',
  'INTERNAL',
  'SERVER',
  'CLIENT',
  'PRODUCER',
  'CONSUMER',
];

export function formatDuration(ms: number): string {
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatClock(ms: number, withMilliseconds = false): string {
  const date = new Date(ms);
  const clock = date.toLocaleTimeString('es-MX', { hour12: false });
  return withMilliseconds
    ? `${clock}.${String(date.getMilliseconds()).padStart(3, '0')}`
    : clock;
}

export function formatClockMinutes(ms: number): string {
  return new Date(ms).toLocaleTimeString('es-MX', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSpanKind(kind: number): string {
  return SPAN_KINDS[kind] ?? 'UNSPECIFIED';
}

export function formatAttributeValue(value: TelemetryJsonValue): string {
  return typeof value === 'object' && value !== null
    ? JSON.stringify(value)
    : String(value);
}

export function formatMetricValue(value: number, unit: string | null): string {
  const text =
    Math.abs(value) >= 100
      ? String(Math.round(value))
      : Math.abs(value) >= 10
        ? value.toFixed(1)
        : value.toFixed(2);
  return unit ? `${text} ${unit}` : text;
}
