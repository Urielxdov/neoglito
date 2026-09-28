import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
} from "@nestjs/common";
import { PROJECT_REPOSITORY } from "../../domain/entities/project.repository.js";
import type { ProjectRepository } from "../../domain/entities/project.repository.js";
import { Project } from "../../domain/entities/project.entity.js";
import { ProjectResponse } from "../responses/project.response.js";

@Injectable()
export class UpdateProjectUseCase {
    constructor(
        @Inject(PROJECT_REPOSITORY)
        private readonly projectRepository: ProjectRepository,
    ) {}

    async execute(
        id: number,
        name: string,
        description: string,
    ): Promise<ProjectResponse> {
        const trimmedName = name?.trim()
        const trimmedDescription = description?.trim()

        if (!trimmedName || !trimmedDescription) {
            throw new BadRequestException("Name and description are required")
        }

        const existing = await this.projectRepository.findById(id)
        const projectWithSameName = await this.projectRepository.findByName(trimmedName)

        if (projectWithSameName && projectWithSameName.id !== id) {
            throw new ConflictException(`Project with name ${trimmedName} already exists`)
        }

        const updated = await this.projectRepository.save(
            new Project(id, trimmedName, trimmedDescription, existing.createdAt, existing.updatedAt),
        )

        if (updated.id === undefined) {
            throw new Error("Project was persisted without an id")
        }

        return new ProjectResponse(
            updated.id,
            updated.name,
            updated.description,
            updated.createdAt.toISOString(),
            updated.updatedAt.toISOString(),
            updated.repositories,
        )
    }
}
