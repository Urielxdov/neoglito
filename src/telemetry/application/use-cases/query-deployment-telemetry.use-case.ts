import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { TelemetryLog } from '../../domain/entities/telemetry-log.js';
import type { TelemetryMetricPoint } from '../../domain/entities/telemetry-metric-point.js';
import type { TelemetrySpan } from '../../domain/entities/telemetry-span.js';
import {
  DEFAULT_TELEMETRY_PAGE_SIZE,
  MAX_TELEMETRY_PAGE_SIZE,
} from '../dto/telemetry-query.js';
import type { TelemetryPage } from '../dto/telemetry-query.js';
import { TELEMETRY_REPOSITORY } from '../ports/telemetry-repository.port.js';
import type {
  TelemetryQuery,
  TelemetryRepositoryPort,
} from '../ports/telemetry-repository.port.js';

export interface TelemetryFilters {
  service?: string;
  from?: Date;
  to?: Date;
  before?: Date;
  limit?: number;
}

@Injectable()
export class QueryDeploymentTelemetryUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TELEMETRY_REPOSITORY)
    private readonly repository: TelemetryRepositoryPort,
  ) {}

  spans(deploymentId: string, filters: TelemetryFilters) {
    return this.page(
      deploymentId,
      filters,
      (query) => this.repository.listSpans(query),
      (span: TelemetrySpan) => span.startTime,
    );
  }

  metrics(deploymentId: string, filters: TelemetryFilters & { name?: string }) {
    return this.page(
      deploymentId,
      filters,
      (query) =>
        this.repository.listMetricPoints({ ...query, name: filters.name }),
      (point: TelemetryMetricPoint) => point.time,
    );
  }

  logs(
    deploymentId: string,
    filters: TelemetryFilters & { severity?: string },
  ) {
    return this.page(
      deploymentId,
      filters,
      (query) =>
        this.repository.listLogs({
          ...query,
          severity: filters.severity?.toUpperCase(),
        }),
      (log: TelemetryLog) => log.time,
    );
  }

  private async page<T>(
    deploymentId: string,
    filters: TelemetryFilters,
    list: (query: TelemetryQuery) => Promise<T[]>,
    timeOf: (item: T) => Date,
  ): Promise<TelemetryPage<T>> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      select: { id: true },
    });
    if (!deployment)
      throw new NotFoundException(`Deployment ${deploymentId} does not exist`);

    const limit = Math.min(
      Math.max(Math.trunc(filters.limit ?? DEFAULT_TELEMETRY_PAGE_SIZE), 1),
      MAX_TELEMETRY_PAGE_SIZE,
    );
    // Se pide uno de más para saber si existe otra página.
    const rows = await list({ ...filters, deploymentId, limit: limit + 1 });
    const items = rows.slice(0, limit);
    return {
      items,
      nextBefore:
        rows.length > limit
          ? timeOf(items[items.length - 1]).toISOString()
          : null,
    };
  }
}
