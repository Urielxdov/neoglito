import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
} from "@nestjs/common";
import { PROJECT_REPOSITORY } from "../../domain/entities/project.repository.js";
import { REPOSITORY_REPOSITORY } from "../../domain/entities/repository.repository.js";
import type { ProjectRepository } from "../../domain/entities/project.repository.js";
import type { RepositoryRepository } from "../../domain/entities/repository.repository.js";
import { Repository } from "../../domain/entities/repository.entity.js";
import { ENCRYPTION_PORT } from "../../../shared/application/encryption.port.js";
import type { EncryptionPort } from "../../../shared/application/encryption.port.js";
import { CreateRepositoryRequest } from "../requests/create-repository.request.js";
import { CreateRepositoryResponse } from "../responses/create-repository.response.js";

@Injectable()
export class CreateRepositoryUseCase {
    constructor(
        @Inject(REPOSITORY_REPOSITORY)
        private readonly repositoryRepository: RepositoryRepository,
        @Inject(PROJECT_REPOSITORY)
        private readonly projectRepository: ProjectRepository,
        @Inject(ENCRYPTION_PORT)
        private readonly encryptionService: EncryptionPort,
    ) {}

    async execute(
        request: CreateRepositoryRequest,
    ): Promise<CreateRepositoryResponse> {
        const cloneUrl = request.cloneUrl?.trim()
        const sshPrivateKey = request.sshPrivateKey
        const technology = request.technology?.trim()

        if (
            !Number.isInteger(request.projectId) ||
            request.projectId <= 0 ||
            !cloneUrl ||
            !sshPrivateKey ||
            !sshPrivateKey.trim() ||
            !technology
        ) {
            throw new BadRequestException(
                "projectId, cloneUrl, sshPrivateKey and technology are required",
            )
        }

        await this.projectRepository.findById(request.projectId)

        const existingRepository =
            await this.repositoryRepository.findByProjectIdAndCloneUrl(
                request.projectId,
                cloneUrl,
            )

        if (existingRepository) {
            throw new ConflictException(
                "A repository with this cloneUrl already exists for this project",
            )
        }

        const now = new Date()
        const encryptedSshPrivateKey = await this.encryptionService.encrypt(
            sshPrivateKey,
        )
        const repository = await this.repositoryRepository.save(
            new Repository(
                undefined,
                request.projectId,
                cloneUrl,
                encryptedSshPrivateKey,
                technology,
                null,
                now,
                now,
            ),
        )

        if (repository.id === undefined) {
            throw new Error("Repository was created without an id")
        }

        return new CreateRepositoryResponse(
            repository.id,
            repository.projectId,
            repository.cloneUrl,
            repository.technology,
            repository.createdAt.toISOString(),
            repository.updatedAt.toISOString(),
        )
    }
}
