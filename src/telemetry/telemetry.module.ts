import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DEPLOYMENT_TELEMETRY_TOKEN_PORT } from './application/ports/deployment-telemetry-token.port.js';
import { TELEMETRY_INJECTOR_PORT } from './application/ports/telemetry-injector.port.js';
import { TELEMETRY_REPOSITORY } from './application/ports/telemetry-repository.port.js';
import { IngestTelemetryUseCase } from './application/use-cases/ingest-telemetry.use-case.js';
import { PurgeExpiredTelemetryUseCase } from './application/use-cases/purge-expired-telemetry.use-case.js';
import { QueryDeploymentTelemetryUseCase } from './application/use-cases/query-deployment-telemetry.use-case.js';
import { OtelComposeInjector } from './infrastructure/injection/otel-compose-injector.service.js';
import { PrismaDeploymentTelemetryTokenRepository } from './infrastructure/persistence/prisma-deployment-telemetry-token.repository.js';
import { PrismaTelemetryRepository } from './infrastructure/persistence/prisma-telemetry.repository.js';
import { TelemetryRetentionService } from './infrastructure/retention/telemetry-retention.service.js';
import { TelemetryIngestController } from './presentation/telemetry-ingest.controller.js';
import { TelemetryIngestGuard } from './presentation/telemetry-ingest.guard.js';
import { TelemetryQueryController } from './presentation/telemetry-query.controller.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TelemetryIngestController, TelemetryQueryController],
  providers: [
    IngestTelemetryUseCase,
    QueryDeploymentTelemetryUseCase,
    PurgeExpiredTelemetryUseCase,
    TelemetryIngestGuard,
    TelemetryRetentionService,
    {
      provide: TELEMETRY_REPOSITORY,
      useClass: PrismaTelemetryRepository,
    },
    {
      provide: DEPLOYMENT_TELEMETRY_TOKEN_PORT,
      useClass: PrismaDeploymentTelemetryTokenRepository,
    },
    {
      provide: TELEMETRY_INJECTOR_PORT,
      useClass: OtelComposeInjector,
    },
  ],
  exports: [DEPLOYMENT_TELEMETRY_TOKEN_PORT, TELEMETRY_INJECTOR_PORT],
})
export class TelemetryModule {}
