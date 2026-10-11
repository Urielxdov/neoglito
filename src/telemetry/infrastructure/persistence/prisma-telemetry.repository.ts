import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  TelemetryQuery,
  TelemetryRepositoryPort,
} from '../../application/ports/telemetry-repository.port.js';
import type { TelemetryLog } from '../../domain/entities/telemetry-log.js';
import type {
  MetricType,
  TelemetryMetricPoint,
} from '../../domain/entities/telemetry-metric-point.js';
import type { TelemetrySpan } from '../../domain/entities/telemetry-span.js';
import type { JsonObject } from '../../domain/value-objects/json-value.js';

/** Un lote OTLP grande no debe superar el límite de parámetros de PostgreSQL. */
const INSERT_CHUNK = 1_000;

function chunks<T>(items: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += INSERT_CHUNK)
    result.push(items.slice(index, index + INSERT_CHUNK));
  return result;
}

const timeRange = (query: TelemetryQuery) => {
  const bounds: { gte?: Date; lte?: Date; lt?: Date } = {};
  if (query.from) bounds.gte = query.from;
  if (query.to) bounds.lte = query.to;
  if (query.before) bounds.lt = query.before;
  return Object.keys(bounds).length > 0 ? bounds : undefined;
};

@Injectable()
export class PrismaTelemetryRepository implements TelemetryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async saveSpans(spans: readonly TelemetrySpan[]): Promise<void> {
    for (const batch of chunks(spans))
      await this.prisma.telemetrySpan.createMany({
        data: batch.map((span) => ({ ...span })),
      });
  }

  async saveMetricPoints(
    points: readonly TelemetryMetricPoint[],
  ): Promise<void> {
    for (const batch of chunks(points))
      await this.prisma.telemetryMetricPoint.createMany({
        data: batch.map(({ histogram, ...point }) => ({
          ...point,
          // Prisma distingue JSON null de NULL de la columna.
          histogram: histogram ?? undefined,
        })),
      });
  }

  async saveLogs(logs: readonly TelemetryLog[]): Promise<void> {
    for (const batch of chunks(logs))
      await this.prisma.telemetryLog.createMany({
        data: batch.map((log) => ({ ...log })),
      });
  }

  async listSpans(query: TelemetryQuery): Promise<TelemetrySpan[]> {
    const rows = await this.prisma.telemetrySpan.findMany({
      where: {
        deploymentId: query.deploymentId,
        ...(query.service ? { serviceName: query.service } : {}),
        startTime: timeRange(query),
      },
      orderBy: { startTime: 'desc' },
      take: query.limit,
    });
    return rows.map(({ id: _id, ...row }) => ({
      ...row,
      attributes: row.attributes as JsonObject,
      resource: row.resource as JsonObject,
    }));
  }

  async listMetricPoints(
    query: TelemetryQuery & { readonly name?: string },
  ): Promise<TelemetryMetricPoint[]> {
    const rows = await this.prisma.telemetryMetricPoint.findMany({
      where: {
        deploymentId: query.deploymentId,
        ...(query.service ? { serviceName: query.service } : {}),
        ...(query.name ? { name: query.name } : {}),
        time: timeRange(query),
      },
      orderBy: { time: 'desc' },
      take: query.limit,
    });
    return rows.map(({ id: _id, ...row }) => ({
      ...row,
      type: row.type as MetricType,
      histogram: row.histogram as JsonObject | null,
      attributes: row.attributes as JsonObject,
    }));
  }

  async listLogs(
    query: TelemetryQuery & { readonly severity?: string },
  ): Promise<TelemetryLog[]> {
    const rows = await this.prisma.telemetryLog.findMany({
      where: {
        deploymentId: query.deploymentId,
        ...(query.service ? { serviceName: query.service } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
        time: timeRange(query),
      },
      orderBy: { time: 'desc' },
      take: query.limit,
    });
    return rows.map(({ id: _id, ...row }) => ({
      ...row,
      attributes: row.attributes as JsonObject,
    }));
  }

  async deleteOlderThan(cutoff: Date, batchSize: number): Promise<number> {
    // Prisma no admite LIMIT en deleteMany; se acota por id para no bloquear la tabla.
    const olderThan = (
      table: 'TelemetrySpan' | 'TelemetryMetricPoint' | 'TelemetryLog',
      column: 'startTime' | 'time',
    ): Promise<number> =>
      this.prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE "id" IN (SELECT "id" FROM "${table}" WHERE "${column}" < $1 LIMIT $2)`,
        cutoff,
        batchSize,
      );
    return (
      (await olderThan('TelemetrySpan', 'startTime')) +
      (await olderThan('TelemetryMetricPoint', 'time')) +
      (await olderThan('TelemetryLog', 'time'))
    );
  }
}
