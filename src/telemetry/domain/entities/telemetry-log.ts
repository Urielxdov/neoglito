import type { JsonObject } from '../value-objects/json-value.js';

export interface TelemetryLog {
  readonly deploymentId: string | null;
  readonly serviceName: string;
  readonly time: Date;
  readonly severity: string;
  readonly body: string;
  readonly traceId: string | null;
  readonly spanId: string | null;
  readonly attributes: JsonObject;
}
