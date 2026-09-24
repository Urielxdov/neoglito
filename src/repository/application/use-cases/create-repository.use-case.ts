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
import { CreateRepositoryRequest } from "../requests/create-repository.request.js";
import { CreateRepositoryResponse } from "../responses/create-repository.response.js";

@Injectable()
export class CreateRepositoryUseCase {
    constructor(
        @Inject(REPOSITORY_REPOSITORY)
        private readonly repositoryRepository: RepositoryRepository,
        @Inject(PROJECT_REPOSITORY)
        private readonly projectRepository: ProjectRepository,
    ) {}

    async execute(
        request: CreateRepositoryRequest,
    ): Promise<CreateRepositoryResponse> {
        const id = request.id
        const name = request.name?.trim()
        const gitUrl = request.gitUrl?.trim()
        const cloneUrl = request.cloneUrl?.trim()

        if (
            !Number.isInteger(request.projectId) ||
            request.projectId <= 0 ||
            !Number.isInteger(id) ||
            id <= 0 ||
            !name ||
            !gitUrl ||
            !cloneUrl
        ) {
            throw new BadRequestException(
                "projectId, id, name, gitUrl and cloneUrl are required",
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

        const repository = await this.repositoryRepository.save(
            new Repository(
                id,
                [request.projectId],
                name,
                gitUrl,
                cloneUrl,
            ),
        )

        return new CreateRepositoryResponse(
            repository.id,
            request.projectId,
            repository.name,
            repository.gitUrl,
            repository.cloneUrl,
        )
    }
}
