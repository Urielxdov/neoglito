import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CreateProjectUseCase } from './application/use-cases/create-project.use-case.js';
import { GetProjectsUseCase } from './application/use-cases/get-projects.use-case.js';
import { UpdateProjectUseCase } from './application/use-cases/update-project.use-case.js';
import { PROJECT_REPOSITORY } from './domain/entities/project.repository.js';
import { PrismaProjectRepository } from './infrastructure/persistence/prisma-project.repository.js';
import { ProjectController } from './presentation/project.controller.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ProjectController],
  providers: [
    CreateProjectUseCase,
    GetProjectsUseCase,
    UpdateProjectUseCase,
    {
      provide: PROJECT_REPOSITORY,
      useClass: PrismaProjectRepository,
    },
  ],
  exports: [PROJECT_REPOSITORY],
})
export class ProjectModule {}
