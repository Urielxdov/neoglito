import type { IsoDateString } from '@neoglito/shared/api';
import type { TelemetryAttributes } from './telemetry-attributes.js';

export type TelemetryMetricType =
  | 'gauge'
  | 'sum'
  | 'histogram'
  | 'exponential_histogram'
  | 'summary';

export interface TelemetryMetricPointResponse {
  deploymentId: string | null;
  serviceName: string;
  name: string;
  unit: string | null;
  type: TelemetryMetricType;
  time: IsoDateString;
  /** Valor de gauge/sum; suma acumulada en histogramas y summaries. */
  value: number | null;
  histogram: TelemetryAttributes | null;
  attributes: TelemetryAttributes;
}
