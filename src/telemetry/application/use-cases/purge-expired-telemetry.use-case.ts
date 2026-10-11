import { Inject, Injectable } from '@nestjs/common';
import { TELEMETRY_REPOSITORY } from '../ports/telemetry-repository.port.js';
import type { TelemetryRepositoryPort } from '../ports/telemetry-repository.port.js';

const BATCH_SIZE = 5_000;
const MAX_ROUNDS = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PurgeExpiredTelemetryUseCase {
  constructor(
    @Inject(TELEMETRY_REPOSITORY)
    private readonly repository: TelemetryRepositoryPort,
  ) {}

  /** Borra en lotes lo anterior a `retentionDays`; devuelve el total eliminado. */
  async execute(
    retentionDays: number,
    now: Date = new Date(),
  ): Promise<number> {
    const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);
    let total = 0;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const deleted = await this.repository.deleteOlderThan(cutoff, BATCH_SIZE);
      total += deleted;
      if (deleted === 0) break;
    }
    return total;
  }
}
