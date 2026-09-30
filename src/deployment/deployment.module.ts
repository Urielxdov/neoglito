import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RepositoryModule } from '../repository/repository.module.js';
import { ContainerModule } from '../container/container.module.js';
import { FILE_FINDER_PORT } from '../shared/application/file-finder.port.js';
import { ENVIROMENT_VARIABLE_EXTRACT_PORT } from '../shared/application/enviroment-variable-extract.port.js';
import { ExtractEnvironmentVariablesUseCase } from '../shared/application/extract-environment-variables.use-case.js';
import { RecursiveFileFinderService } from '../shared/infrastructure/files/recursive-file-finder.service.js';
import { YamlComposeEnviromentVariableExtractService } from '../shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.js';
import { CloneProjectRepositoriesUseCase } from './application/use-cases/clone-project-repositories.use-case.js';
import {
  DeployComposeUseCase,
  GetProjectDeploymentsUseCase,
  StopDeploymentUseCase,
} from './application/use-cases/deploy-compose.use-case.js';
import { GetProjectComposeFilesUseCase } from './application/use-cases/get-project-compose-files.use-case.js';
import { InitDeployProjectUseCase } from './application/use-cases/init-deploy-project.use-case.js';
import {
  DeploymentController,
  ProjectDeploymentController,
} from './presentation/deployment.controller.js';

@Module({
  imports: [AuthModule, PrismaModule, RepositoryModule, ContainerModule],
  controllers: [DeploymentController, ProjectDeploymentController],
  providers: [
    CloneProjectRepositoriesUseCase,
    DeployComposeUseCase,
    GetProjectDeploymentsUseCase,
    StopDeploymentUseCase,
    GetProjectComposeFilesUseCase,
    InitDeployProjectUseCase,
    ExtractEnvironmentVariablesUseCase,
    RecursiveFileFinderService,
    YamlComposeEnviromentVariableExtractService,
    {
      provide: FILE_FINDER_PORT,
      useExisting: RecursiveFileFinderService,
    },
    {
      provide: ENVIROMENT_VARIABLE_EXTRACT_PORT,
      useExisting: YamlComposeEnviromentVariableExtractService,
    },
  ],
})
export class DeploymentModule {}
