import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AnalysisModule } from '../analisys/analysis.module.js';
import { ContainerModule } from '../container/container.module.js';
import { PortModule } from '../ports/port.module.js';
import { TelemetryModule } from '../telemetry/telemetry.module.js';
import {
  DeployComposeUseCase,
  GetProjectDeploymentsUseCase,
  StopDeploymentUseCase,
} from './application/use-cases/deploy-compose.use-case.js';
import { ClassifyDeploymentServicesUseCase } from './application/use-cases/classify-deployment-services.use-case.js';
import { GetDeploymentPortsUseCase } from './application/use-cases/get-deployment-ports.use-case.js';
import { DEPLOYMENT_COMPOSE_PORT } from './application/ports/deployment-compose.port.js';
import { YamlDeploymentComposeService } from './infrastructure/compose/yaml-deployment-compose.service.js';
import {
  DeploymentController,
  ProjectDeploymentController,
} from './presentation/deployment.controller.js';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    AnalysisModule,
    ContainerModule,
    PortModule,
    TelemetryModule,
  ],
  controllers: [DeploymentController, ProjectDeploymentController],
  providers: [
    {
      provide: DEPLOYMENT_COMPOSE_PORT,
      useClass: YamlDeploymentComposeService,
    },
    DeployComposeUseCase,
    GetProjectDeploymentsUseCase,
    GetDeploymentPortsUseCase,
    StopDeploymentUseCase,
    ClassifyDeploymentServicesUseCase,
  ],
})
export class DeploymentModule {}
