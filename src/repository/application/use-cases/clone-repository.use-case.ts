import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
} from "@nestjs/common";
import { ENCRYPTION_PORT } from "../../../shared/application/encryption.port.js";
import type { EncryptionPort } from "../../../shared/application/encryption.port.js";
import { GIT_CLONER_PORT } from "../../../shared/application/repository-cloner.port.js";
import type { RepositoryClonerPort } from "../../../shared/application/repository-cloner.port.js";
import { PROJECT_REPOSITORY, type ProjectRepository } from "../../domain/entities/project.repository.js";
import { REPOSITORY_REPOSITORY, type RepositoryRepository } from "../../domain/entities/repository.repository.js";
import { Repository } from "../../domain/entities/repository.entity.js";
import { CloneRepositoryDto } from "../dto/clone-repository.dto.js";

@Injectable()
export class CloneRepositoryUseCase {
    constructor(
        @Inject(ENCRYPTION_PORT)
        private readonly encryptionService: EncryptionPort,
        @Inject(PROJECT_REPOSITORY)
        private readonly projectRepository: ProjectRepository,
        @Inject(REPOSITORY_REPOSITORY)
        private readonly repositoryRepository: RepositoryRepository,
        @Inject(GIT_CLONER_PORT)
        private readonly gitClonerService: RepositoryClonerPort,
    ) {}

    async execute(request: CloneRepositoryDto): Promise<string> {
        const cloneUrl = request.cloneUrl?.trim()
        const sshPrivateKey = request.sshPrivateKey
        const technology = request.technology?.trim() || null

        if (
            !Number.isInteger(request.projectId) ||
            request.projectId <= 0 ||
            !cloneUrl ||
            !sshPrivateKey ||
            !sshPrivateKey.trim()
        ) {
            throw new BadRequestException(
                "projectId, cloneUrl and sshPrivateKey are required",
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

        const pathSystem = await this.gitClonerService.clone(
            cloneUrl,
            sshPrivateKey,
        )
        const encryptedSshPrivateKey = await this.encryptionService.encrypt(
            sshPrivateKey,
        )
        const now = new Date()

        await this.repositoryRepository.save(
            new Repository(
                undefined,
                request.projectId,
                cloneUrl,
                encryptedSshPrivateKey,
                technology,
                pathSystem,
                now,
                now,
            ),
        )

        return pathSystem
    }
}
