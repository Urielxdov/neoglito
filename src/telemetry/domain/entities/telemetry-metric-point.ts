import type { JsonObject } from '../value-objects/json-value.js';

export type MetricType =
  'gauge' | 'sum' | 'histogram' | 'exponential_histogram' | 'summary';

export interface TelemetryMetricPoint {
  readonly deploymentId: string | null;
  readonly serviceName: string;
  readonly name: string;
  readonly unit: string | null;
  readonly type: MetricType;
  readonly time: Date;
  /** Valor de gauge/sum; suma acumulada en histogramas y summaries. */
  readonly value: number | null;
  readonly histogram: JsonObject | null;
  readonly attributes: JsonObject;
}
