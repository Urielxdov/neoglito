import type { IsoDateString } from '@neoglito/shared/api';
import type { TelemetryAttributes } from './telemetry-attributes.js';

export interface TelemetrySpanResponse {
  deploymentId: string | null;
  serviceName: string;
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  /** Numeración OTLP: 0 sin especificar, 1 interno, 2 servidor, 3 cliente, 4 productor, 5 consumidor. */
  kind: number;
  startTime: IsoDateString;
  endTime: IsoDateString;
  durationMs: number;
  /** Numeración OTLP: 0 sin establecer, 1 OK, 2 error. */
  statusCode: number;
  statusMessage: string | null;
  attributes: TelemetryAttributes;
  resource: TelemetryAttributes;
}
