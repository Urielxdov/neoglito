import { Inject, Injectable } from '@nestjs/common';
import type { TelemetryLog } from '../../domain/entities/telemetry-log.js';
import type { TelemetryMetricPoint } from '../../domain/entities/telemetry-metric-point.js';
import type { TelemetrySpan } from '../../domain/entities/telemetry-span.js';
import { TELEMETRY_REPOSITORY } from '../ports/telemetry-repository.port.js';
import type { TelemetryRepositoryPort } from '../ports/telemetry-repository.port.js';

/** Persiste telemetría ya decodificada; devuelve cuántos registros guardó. */
@Injectable()
export class IngestTelemetryUseCase {
  constructor(
    @Inject(TELEMETRY_REPOSITORY)
    private readonly repository: TelemetryRepositoryPort,
  ) {}

  async spans(spans: readonly TelemetrySpan[]): Promise<number> {
    if (spans.length > 0) await this.repository.saveSpans(spans);
    return spans.length;
  }

  async metricPoints(points: readonly TelemetryMetricPoint[]): Promise<number> {
    if (points.length > 0) await this.repository.saveMetricPoints(points);
    return points.length;
  }

  async logs(logs: readonly TelemetryLog[]): Promise<number> {
    if (logs.length > 0) await this.repository.saveLogs(logs);
    return logs.length;
  }
}
