import { Inject, Injectable } from '@nestjs/common';
import {
  mapLogs,
  mapMetrics,
  mapTraces,
} from '../../infrastructure/otlp/otlp-json-mapper.js';
import { TELEMETRY_REPOSITORY } from '../ports/telemetry-repository.port.js';
import type { TelemetryRepositoryPort } from '../ports/telemetry-repository.port.js';

/** Recibe el cuerpo OTLP/JSON ya autenticado y lo persiste; devuelve cuántos registros guardó. */
@Injectable()
export class IngestTelemetryUseCase {
  constructor(
    @Inject(TELEMETRY_REPOSITORY)
    private readonly repository: TelemetryRepositoryPort,
  ) {}

  async traces(body: unknown, deploymentId: string | null): Promise<number> {
    const spans = mapTraces(body, deploymentId);
    if (spans.length > 0) await this.repository.saveSpans(spans);
    return spans.length;
  }

  async metrics(body: unknown, deploymentId: string | null): Promise<number> {
    const points = mapMetrics(body, deploymentId);
    if (points.length > 0) await this.repository.saveMetricPoints(points);
    return points.length;
  }

  async logs(body: unknown, deploymentId: string | null): Promise<number> {
    const logs = mapLogs(body, deploymentId);
    if (logs.length > 0) await this.repository.saveLogs(logs);
    return logs.length;
  }
}
