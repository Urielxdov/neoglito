import type { TelemetryLog } from '../../domain/entities/telemetry-log.js';
import type { TelemetryMetricPoint } from '../../domain/entities/telemetry-metric-point.js';
import type { TelemetrySpan } from '../../domain/entities/telemetry-span.js';

export const TELEMETRY_REPOSITORY = Symbol('TELEMETRY_REPOSITORY');

export interface TelemetryQuery {
  readonly deploymentId: string;
  readonly service?: string;
  readonly from?: Date;
  readonly to?: Date;
  /** Solo registros anteriores a este instante (paginación por cursor de tiempo). */
  readonly before?: Date;
  readonly limit: number;
}

export interface TelemetryRepositoryPort {
  saveSpans(spans: readonly TelemetrySpan[]): Promise<void>;
  saveMetricPoints(points: readonly TelemetryMetricPoint[]): Promise<void>;
  saveLogs(logs: readonly TelemetryLog[]): Promise<void>;
  /** Más recientes primero. */
  listSpans(query: TelemetryQuery): Promise<TelemetrySpan[]>;
  listMetricPoints(
    query: TelemetryQuery & { readonly name?: string },
  ): Promise<TelemetryMetricPoint[]>;
  listLogs(
    query: TelemetryQuery & { readonly severity?: string },
  ): Promise<TelemetryLog[]>;
  /** Borra hasta `batchSize` filas por señal anteriores a `cutoff`; devuelve las borradas. */
  deleteOlderThan(cutoff: Date, batchSize: number): Promise<number>;
}
