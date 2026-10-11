/** Subconjunto del JSON OTLP/HTTP que recibe el backend desde el collector. */
export type OtlpNanos = string | number;

export interface OtlpAnyValue {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: string | number;
  doubleValue?: number;
  bytesValue?: string;
  arrayValue?: { values?: OtlpAnyValue[] };
  kvlistValue?: { values?: OtlpKeyValue[] };
}

export interface OtlpKeyValue {
  key?: string;
  value?: OtlpAnyValue;
}

export interface OtlpResource {
  attributes?: OtlpKeyValue[];
}

export interface OtlpSpan {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  name?: string;
  kind?: number | string;
  startTimeUnixNano?: OtlpNanos;
  endTimeUnixNano?: OtlpNanos;
  attributes?: OtlpKeyValue[];
  status?: { code?: number | string; message?: string };
}

export interface OtlpTracesRequest {
  resourceSpans?: Array<{
    resource?: OtlpResource;
    scopeSpans?: Array<{ spans?: OtlpSpan[] }>;
  }>;
}

export interface OtlpNumberDataPoint {
  attributes?: OtlpKeyValue[];
  timeUnixNano?: OtlpNanos;
  asInt?: string | number;
  asDouble?: number;
}

export interface OtlpHistogramDataPoint {
  attributes?: OtlpKeyValue[];
  timeUnixNano?: OtlpNanos;
  count?: string | number;
  sum?: number;
  min?: number;
  max?: number;
  bucketCounts?: Array<string | number>;
  explicitBounds?: number[];
}

export interface OtlpExponentialHistogramDataPoint {
  attributes?: OtlpKeyValue[];
  timeUnixNano?: OtlpNanos;
  count?: string | number;
  sum?: number;
  min?: number;
  max?: number;
  scale?: number;
  zeroCount?: string | number;
  positive?: { offset?: number; bucketCounts?: Array<string | number> };
  negative?: { offset?: number; bucketCounts?: Array<string | number> };
}

export interface OtlpSummaryDataPoint {
  attributes?: OtlpKeyValue[];
  timeUnixNano?: OtlpNanos;
  count?: string | number;
  sum?: number;
  quantileValues?: Array<{ quantile?: number; value?: number }>;
}

export interface OtlpMetric {
  name?: string;
  unit?: string;
  gauge?: { dataPoints?: OtlpNumberDataPoint[] };
  sum?: { dataPoints?: OtlpNumberDataPoint[] };
  histogram?: { dataPoints?: OtlpHistogramDataPoint[] };
  exponentialHistogram?: { dataPoints?: OtlpExponentialHistogramDataPoint[] };
  summary?: { dataPoints?: OtlpSummaryDataPoint[] };
}

export interface OtlpMetricsRequest {
  resourceMetrics?: Array<{
    resource?: OtlpResource;
    scopeMetrics?: Array<{ metrics?: OtlpMetric[] }>;
  }>;
}

export interface OtlpLogRecord {
  timeUnixNano?: OtlpNanos;
  observedTimeUnixNano?: OtlpNanos;
  severityNumber?: number | string;
  severityText?: string;
  body?: OtlpAnyValue;
  attributes?: OtlpKeyValue[];
  traceId?: string;
  spanId?: string;
}

export interface OtlpLogsRequest {
  resourceLogs?: Array<{
    resource?: OtlpResource;
    scopeLogs?: Array<{ logRecords?: OtlpLogRecord[] }>;
  }>;
}
