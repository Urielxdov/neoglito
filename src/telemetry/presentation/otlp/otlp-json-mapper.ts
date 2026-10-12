import { BadRequestException } from '@nestjs/common';
import type {
  MetricType,
  TelemetryMetricPoint,
} from '../../domain/entities/telemetry-metric-point.js';
import type { TelemetryLog } from '../../domain/entities/telemetry-log.js';
import type { TelemetrySpan } from '../../domain/entities/telemetry-span.js';
import type {
  JsonObject,
  JsonValue,
} from '../../domain/value-objects/json-value.js';
import type {
  OtlpAnyValue,
  OtlpExponentialHistogramDataPoint,
  OtlpHistogramDataPoint,
  OtlpKeyValue,
  OtlpLogRecord,
  OtlpLogsRequest,
  OtlpMetric,
  OtlpMetricsRequest,
  OtlpNanos,
  OtlpNumberDataPoint,
  OtlpResource,
  OtlpSpan,
  OtlpSummaryDataPoint,
  OtlpTracesRequest,
} from '../../application/dto/otlp.js';

const UNKNOWN_SERVICE = 'unknown_service';

const SPAN_KINDS: Record<string, number> = {
  SPAN_KIND_UNSPECIFIED: 0,
  SPAN_KIND_INTERNAL: 1,
  SPAN_KIND_SERVER: 2,
  SPAN_KIND_CLIENT: 3,
  SPAN_KIND_PRODUCER: 4,
  SPAN_KIND_CONSUMER: 5,
};

const STATUS_CODES: Record<string, number> = {
  STATUS_CODE_UNSET: 0,
  STATUS_CODE_OK: 1,
  STATUS_CODE_ERROR: 2,
};

const SEVERITY_BY_RANGE: ReadonlyArray<readonly [number, string]> = [
  [4, 'TRACE'],
  [8, 'DEBUG'],
  [12, 'INFO'],
  [16, 'WARN'],
  [20, 'ERROR'],
  [24, 'FATAL'],
];

const asArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const asText = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const asNumber = (value: unknown): number | null => {
  const parsed =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};

const enumValue = (
  value: number | string | undefined,
  names: Record<string, number>,
): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return names[value] ?? (Number.isFinite(parsed) ? parsed : 0);
  }
  return 0;
};

/** Los timestamps OTLP son nanosegundos como string (JSON no representa int64). */
export function nanosToDate(value: OtlpNanos | undefined): Date | null {
  if (value === undefined || value === null || value === '') return null;
  try {
    const nanos = BigInt(typeof value === 'number' ? Math.trunc(value) : value);
    if (nanos <= 0n) return null;
    return new Date(Number(nanos / 1_000_000n));
  } catch {
    return null;
  }
}

function durationMs(start: OtlpNanos | undefined, end: OtlpNanos | undefined) {
  try {
    const startNanos = BigInt(start ?? 0);
    const endNanos = BigInt(end ?? 0);
    return endNanos > startNanos ? Number(endNanos - startNanos) / 1e6 : 0;
  } catch {
    return 0;
  }
}

function anyValueToJson(value: OtlpAnyValue | undefined): JsonValue {
  if (!value) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.boolValue !== undefined) return value.boolValue;
  if (value.intValue !== undefined) {
    const parsed = Number(value.intValue);
    // Los int64 fuera del rango seguro de JS se conservan como texto.
    return Number.isSafeInteger(parsed) ? parsed : String(value.intValue);
  }
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.bytesValue !== undefined) return value.bytesValue;
  if (value.arrayValue)
    return asArray<OtlpAnyValue>(value.arrayValue.values).map(anyValueToJson);
  if (value.kvlistValue) return keyValuesToJson(value.kvlistValue.values);
  return null;
}

export function keyValuesToJson(
  attributes: OtlpKeyValue[] | undefined,
): JsonObject {
  const result: JsonObject = {};
  for (const attribute of asArray<OtlpKeyValue>(attributes)) {
    if (typeof attribute?.key === 'string')
      result[attribute.key] = anyValueToJson(attribute.value);
  }
  return result;
}

function serviceNameOf(resource: JsonObject): string {
  const name = resource['service.name'];
  return typeof name === 'string' && name ? name : UNKNOWN_SERVICE;
}

function resourceOf(resource: OtlpResource | undefined) {
  const attributes = keyValuesToJson(resource?.attributes);
  return { attributes, serviceName: serviceNameOf(attributes) };
}

function requireBody(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    throw new BadRequestException('El cuerpo OTLP debe ser un objeto JSON');
  return body as Record<string, unknown>;
}

export function mapTraces(
  body: unknown,
  deploymentId: string | null,
): TelemetrySpan[] {
  const request = requireBody(body) as OtlpTracesRequest;
  const spans: TelemetrySpan[] = [];
  for (const resourceSpans of asArray<
    NonNullable<OtlpTracesRequest['resourceSpans']>[number]
  >(request.resourceSpans)) {
    const resource = resourceOf(resourceSpans?.resource);
    for (const scope of asArray<{ spans?: OtlpSpan[] }>(
      resourceSpans?.scopeSpans,
    )) {
      for (const span of asArray<OtlpSpan>(scope?.spans)) {
        const traceId = asText(span?.traceId);
        const spanId = asText(span?.spanId);
        const startTime = nanosToDate(span?.startTimeUnixNano);
        const endTime = nanosToDate(span?.endTimeUnixNano);
        // Un span sin identidad o sin tiempos no se puede consultar ni ordenar.
        if (!traceId || !spanId || !startTime || !endTime) continue;
        spans.push({
          deploymentId,
          serviceName: resource.serviceName,
          traceId,
          spanId,
          parentSpanId: asText(span.parentSpanId),
          name: asText(span.name) ?? '',
          kind: enumValue(span.kind, SPAN_KINDS),
          startTime,
          endTime,
          durationMs: durationMs(span.startTimeUnixNano, span.endTimeUnixNano),
          statusCode: enumValue(span.status?.code, STATUS_CODES),
          statusMessage: asText(span.status?.message),
          attributes: keyValuesToJson(span.attributes),
          resource: resource.attributes,
        });
      }
    }
  }
  return spans;
}

function numberOf(point: {
  asInt?: string | number;
  asDouble?: number;
}): number | null {
  return asNumber(point.asInt) ?? asNumber(point.asDouble);
}

const countOf = (value: unknown) => asNumber(value);
const countsOf = (values: unknown) =>
  asArray<unknown>(values).map((value) => countOf(value) ?? 0);

export function mapMetrics(
  body: unknown,
  deploymentId: string | null,
): TelemetryMetricPoint[] {
  const request = requireBody(body) as OtlpMetricsRequest;
  const points: TelemetryMetricPoint[] = [];
  for (const resourceMetrics of asArray<
    NonNullable<OtlpMetricsRequest['resourceMetrics']>[number]
  >(request.resourceMetrics)) {
    const resource = resourceOf(resourceMetrics?.resource);
    for (const scope of asArray<{ metrics?: OtlpMetric[] }>(
      resourceMetrics?.scopeMetrics,
    )) {
      for (const metric of asArray<OtlpMetric>(scope?.metrics)) {
        const name = asText(metric?.name);
        if (!name) continue;
        const base = {
          deploymentId,
          serviceName: resource.serviceName,
          name,
          unit: asText(metric.unit),
        };
        const push = (
          type: MetricType,
          point: { timeUnixNano?: OtlpNanos; attributes?: OtlpKeyValue[] },
          value: number | null,
          histogram: JsonObject | null,
        ) => {
          const time = nanosToDate(point.timeUnixNano);
          if (!time) return;
          points.push({
            ...base,
            type,
            time,
            value,
            histogram,
            attributes: keyValuesToJson(point.attributes),
          });
        };

        for (const point of asArray<OtlpNumberDataPoint>(
          metric.gauge?.dataPoints,
        ))
          push('gauge', point, numberOf(point), null);
        for (const point of asArray<OtlpNumberDataPoint>(
          metric.sum?.dataPoints,
        ))
          push('sum', point, numberOf(point), null);
        for (const point of asArray<OtlpHistogramDataPoint>(
          metric.histogram?.dataPoints,
        ))
          push('histogram', point, asNumber(point.sum), {
            count: countOf(point.count),
            sum: asNumber(point.sum),
            min: asNumber(point.min),
            max: asNumber(point.max),
            bucketCounts: countsOf(point.bucketCounts),
            explicitBounds: asArray<number>(point.explicitBounds),
          });
        for (const point of asArray<OtlpExponentialHistogramDataPoint>(
          metric.exponentialHistogram?.dataPoints,
        ))
          push('exponential_histogram', point, asNumber(point.sum), {
            count: countOf(point.count),
            sum: asNumber(point.sum),
            min: asNumber(point.min),
            max: asNumber(point.max),
            scale: asNumber(point.scale),
            zeroCount: countOf(point.zeroCount),
            positive: {
              offset: asNumber(point.positive?.offset),
              bucketCounts: countsOf(point.positive?.bucketCounts),
            },
            negative: {
              offset: asNumber(point.negative?.offset),
              bucketCounts: countsOf(point.negative?.bucketCounts),
            },
          });
        for (const point of asArray<OtlpSummaryDataPoint>(
          metric.summary?.dataPoints,
        ))
          push('summary', point, asNumber(point.sum), {
            count: countOf(point.count),
            sum: asNumber(point.sum),
            quantileValues: asArray<{ quantile?: number; value?: number }>(
              point.quantileValues,
            ).map((quantile) => ({
              quantile: asNumber(quantile?.quantile),
              value: asNumber(quantile?.value),
            })),
          });
      }
    }
  }
  return points;
}

function severityOf(record: OtlpLogRecord): string {
  const text = asText(record.severityText);
  if (text) return text.toUpperCase();
  const number = enumValue(record.severityNumber, {});
  return (
    SEVERITY_BY_RANGE.find(([limit]) => number >= 1 && number <= limit)?.[1] ??
    'UNSPECIFIED'
  );
}

function bodyOf(body: OtlpAnyValue | undefined): string {
  const value = anyValueToJson(body);
  if (value === null) return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export function mapLogs(
  body: unknown,
  deploymentId: string | null,
  now: () => Date = () => new Date(),
): TelemetryLog[] {
  const request = requireBody(body) as OtlpLogsRequest;
  const logs: TelemetryLog[] = [];
  for (const resourceLogs of asArray<
    NonNullable<OtlpLogsRequest['resourceLogs']>[number]
  >(request.resourceLogs)) {
    const resource = resourceOf(resourceLogs?.resource);
    for (const scope of asArray<{ logRecords?: OtlpLogRecord[] }>(
      resourceLogs?.scopeLogs,
    )) {
      for (const record of asArray<OtlpLogRecord>(scope?.logRecords)) {
        logs.push({
          deploymentId,
          serviceName: resource.serviceName,
          time:
            nanosToDate(record?.timeUnixNano) ??
            nanosToDate(record?.observedTimeUnixNano) ??
            now(),
          severity: severityOf(record ?? {}),
          body: bodyOf(record?.body),
          traceId: asText(record?.traceId),
          spanId: asText(record?.spanId),
          attributes: keyValuesToJson(record?.attributes),
        });
      }
    }
  }
  return logs;
}
