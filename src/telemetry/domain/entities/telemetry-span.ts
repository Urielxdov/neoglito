import type { JsonObject } from '../value-objects/json-value.js';

export interface TelemetrySpan {
  /** null = telemetría de la propia API. */
  readonly deploymentId: string | null;
  readonly serviceName: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId: string | null;
  readonly name: string;
  readonly kind: number;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly durationMs: number;
  readonly statusCode: number;
  readonly statusMessage: string | null;
  readonly attributes: JsonObject;
  readonly resource: JsonObject;
}
