import { Module } from "@nestjs/common";
import { CreateProjectUseCase } from "./application/use-cases/create-project.use-case.js";
import { CreateRepositoryUseCase } from "./application/use-cases/create-repository.use-case.js";
import { PROJECT_REPOSITORY } from "./domain/entities/project.repository.js";
import { REPOSITORY_REPOSITORY } from "./domain/entities/repository.repository.js";
import { PrismaProjectRepository } from "./infrastructure/persistence/prisma-project.repository.js";
import { PrismaRepositoryRepository } from "./infrastructure/persistence/prisma-repository.repository.js";
import { ProjectController } from "./presentation/project.repository.js";
import { RepositoryController } from "./presentation/repository.controller.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ENCRYPTION_PORT } from "../shared/application/encryption.port.js";
import { Aes256GcmEncryptionService } from "../shared/infrastructure/security/aes-256-gcm-encryption.service.js";

@Module({
    controllers: [ProjectController, RepositoryController],
    providers: [
        PrismaService,
        CreateProjectUseCase,
        CreateRepositoryUseCase,
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
    ],
})
export class RepositoryModule {}
