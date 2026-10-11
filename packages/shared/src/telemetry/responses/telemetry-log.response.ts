import type { IsoDateString } from '@neoglito/shared/api';
import type { TelemetryAttributes } from './telemetry-attributes.js';

export interface TelemetryLogResponse {
  deploymentId: string | null;
  serviceName: string;
  time: IsoDateString;
  severity: string;
  body: string;
  traceId: string | null;
  spanId: string | null;
  attributes: TelemetryAttributes;
}
