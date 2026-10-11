import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PurgeExpiredTelemetryUseCase } from '../../application/use-cases/purge-expired-telemetry.use-case.js';
import {
  isTelemetryEnabled,
  telemetryRetentionDays,
} from '../../application/telemetry-config.js';

const PURGE_INTERVAL_MS = 60 * 60 * 1000;

/** Purga horaria de la telemetría anterior a TELEMETRY_RETENTION_DAYS. */
@Injectable()
export class TelemetryRetentionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TelemetryRetentionService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly purge: PurgeExpiredTelemetryUseCase) {}

  onModuleInit(): void {
    if (!isTelemetryEnabled()) return;
    this.timer = setInterval(() => void this.run(), PURGE_INTERVAL_MS);
    // No debe mantener vivo el proceso al apagarse.
    this.timer.unref();
    void this.run();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const days = telemetryRetentionDays();
      const deleted = await this.purge.execute(days);
      if (deleted > 0)
        this.logger.log(
          `[telemetry:retention] Eliminados ${deleted} registros anteriores a ${days} días`,
        );
    } catch (error) {
      this.logger.error(
        `[telemetry:retention] Falló la purga: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
