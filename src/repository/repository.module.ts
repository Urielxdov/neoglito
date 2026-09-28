import { Module } from '@nestjs/common';
import { CreateProjectUseCase } from './application/use-cases/create-project.use-case.js';
import { GetProjectsUseCase } from './application/use-cases/get-projects.use-case.js';
import { CreateRepositoryUseCase } from './application/use-cases/create-repository.use-case.js';
import { CloneRepositoryUseCase } from './application/use-cases/clone-repository.use-case.js';
import { CloneRepositoriesUseCase } from './application/use-cases/clone-repositories.use-case.js';
import { InitDeployProjectUseCase } from './application/use-cases/init-deploy-project.use-case.js';
import { PROJECT_REPOSITORY } from './domain/entities/project.repository.js';
import { REPOSITORY_REPOSITORY } from './domain/entities/repository.repository.js';
import { PrismaProjectRepository } from './infrastructure/persistence/prisma-project.repository.js';
import { PrismaRepositoryRepository } from './infrastructure/persistence/prisma-repository.repository.js';
import { ProjectController } from './presentation/project.controller.js';
import { DeploymentController } from './presentation/deployment.controller.js';
import { RepositoryController } from './presentation/repository.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ENCRYPTION_PORT } from '../shared/application/encryption.port.js';
import { Aes256GcmEncryptionService } from '../shared/infrastructure/security/aes-256-gcm-encryption.service.js';
import { GIT_CLONER_PORT } from '../shared/application/repository-cloner.port.js';
import { GitCloneRepositoryService } from '../shared/infrastructure/git/git-repository-cloner.service.js';
import { FILE_FINDER_PORT } from '../shared/application/file-finder.port.js';
import { RecursiveFileFinderService } from '../shared/infrastructure/files/recursive-file-finder.service.js';
import { ENVIROMENT_VARIABLE_EXTRACT_PORT } from '../shared/application/enviroment-variable-extract.port.js';
import { ExtractEnvironmentVariablesUseCase } from '../shared/application/extract-environment-variables.use-case.js';
import { YamlComposeEnviromentVariableExtractService } from '../shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PassportModule } from '@nestjs/passport';
import { GetRepositoriesUseCase } from './application/use-cases/get-repositories.use-case.js';
import { CONTAINER_RUNTIME_PORT } from '../shared/application/container-runtime.port.js';
import { DockerComposeRuntime } from '../shared/infrastructure/docker/docker-compose-runtime.service.js';
import { GetProjectComposeFilesUseCase } from './application/use-cases/get-project-compose-files.use-case.js';
import {
  DeployComposeUseCase,
  GetProjectDeploymentsUseCase,
  StopDeploymentUseCase,
} from './application/use-cases/deploy-compose.use-case.js';
import { UpdateProjectUseCase } from './application/use-cases/update-project.use-case.js';
import { CacheModule } from '../shared/infrastructure/cache/cache.module.js';

@Module({
  imports: [
    AuthModule,
    CacheModule,
    PassportModule.register({ session: false }),
  ],
  controllers: [ProjectController, DeploymentController, RepositoryController],
  providers: [
    PrismaService,
    CreateProjectUseCase,
    GetProjectsUseCase,
    UpdateProjectUseCase,
    CreateRepositoryUseCase,
    CloneRepositoryUseCase,
    CloneRepositoriesUseCase,
    InitDeployProjectUseCase,
    GetProjectComposeFilesUseCase,
    DeployComposeUseCase,
    GetProjectDeploymentsUseCase,
    StopDeploymentUseCase,
    ExtractEnvironmentVariablesUseCase,
    GetRepositoriesUseCase,
    RecursiveFileFinderService,
    YamlComposeEnviromentVariableExtractService,
    DockerComposeRuntime,
    {
      provide: PROJECT_REPOSITORY,
      useClass: PrismaProjectRepository,
    },
    {
      provide: REPOSITORY_REPOSITORY,
      useClass: PrismaRepositoryRepository,
    },
    {
      provide: ENCRYPTION_PORT,
      useClass: Aes256GcmEncryptionService,
    },
    {
      provide: GIT_CLONER_PORT,
      useClass: GitCloneRepositoryService,
    },
    {
      provide: FILE_FINDER_PORT,
      useExisting: RecursiveFileFinderService,
    },
    {
      provide: ENVIROMENT_VARIABLE_EXTRACT_PORT,
      useExisting: YamlComposeEnviromentVariableExtractService,
    },
    {
      provide: CONTAINER_RUNTIME_PORT,
      useExisting: DockerComposeRuntime,
    },
  ],
  exports: [PrismaService, CacheModule],
})
export class RepositoryModule {}
