import { Module } from '@nestjs/common';
import { CreateRepositoryUseCase } from './application/use-cases/repository/create-repository.use-case.js';
import { GetRepositoriesUseCase } from './application/use-cases/repository/get-repositories.use-case.js';
import { CloneRepositoryUseCase } from './application/use-cases/repository/clone-repository.use-case.js';
import { ProjectModule } from '../project/project.module.js';
import { REPOSITORY_REPOSITORY } from './domain/entities/repository/repository.repository.js';
import { PrismaRepositoryRepository } from './infrastructure/persistence/prisma-repository.repository.js';
import { RepositoryController } from './presentation/repository.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ENCRYPTION_PORT } from '../shared/application/encryption.port.js';
import { Aes256GcmEncryptionService } from '../shared/infrastructure/security/aes-256-gcm-encryption.service.js';
import { GIT_CLONER_PORT } from '../shared/application/repository-cloner.port.js';
import { GitCloneRepositoryService } from '../shared/infrastructure/git/git-repository-cloner.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    ProjectModule,
  ],
  controllers: [RepositoryController],
  providers: [
    CreateRepositoryUseCase,
    CloneRepositoryUseCase,
    GetRepositoriesUseCase,
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
  ],
  exports: [CloneRepositoryUseCase],
})
export class RepositoryModule {}
