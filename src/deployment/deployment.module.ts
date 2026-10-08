import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AnalysisModule } from '../analisys/analysis.module.js';
import { ContainerModule } from '../container/container.module.js';
import { PortModule } from '../ports/port.module.js';
import {
  DeployComposeUseCase,
  GetProjectDeploymentsUseCase,
  StopDeploymentUseCase,
} from './application/use-cases/deploy-compose.use-case.js';
import { ClassifyDeploymentServicesUseCase } from './application/use-cases/classify-deployment-services.use-case.js';
import {
  DeploymentController,
  ProjectDeploymentController,
} from './presentation/deployment.controller.js';

@Module({
  imports: [AuthModule, PrismaModule, AnalysisModule, ContainerModule, PortModule],
  controllers: [DeploymentController, ProjectDeploymentController],
  providers: [
    DeployComposeUseCase,
    GetProjectDeploymentsUseCase,
    StopDeploymentUseCase,
    ClassifyDeploymentServicesUseCase,
  ],
})
export class DeploymentModule {}
