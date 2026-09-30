import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
} from "@nestjs/common";
import { PROJECT_REPOSITORY } from "../../domain/entities/project.repository.js";
import type { ProjectRepository } from "../../domain/entities/project.repository.js";
import { Project } from "../../domain/entities/project.entity.js";
import { CreateProjectRequest } from "../requests/create-project.request.js";
import { CreateProjectResponse } from "../responses/create-project.response.js";

@Injectable()
export class CreateProjectUseCase {
    constructor(
        @Inject(PROJECT_REPOSITORY)
        private readonly projectRepository: ProjectRepository,
    ) {}

    async execute(
        request: CreateProjectRequest,
    ): Promise<CreateProjectResponse> {
        const name = request.name?.trim()
        const description = request.description?.trim()

        if (!name || !description) {
            throw new BadRequestException("Name and description are required")
        }

        const existingProject = await this.projectRepository.findByName(name)

        if (existingProject) {
            throw new ConflictException(`Project with name ${name} already exists`)
        }

        const now = new Date()
        const project = await this.projectRepository.save(
            new Project(undefined, name, description, now, now),
        )

        if (project.id === undefined) {
            throw new Error("Project was created without an id")
        }

        return new CreateProjectResponse(
            project.id,
            project.name,
            project.description,
            project.createdAt.toISOString(),
            project.updatedAt.toISOString(),
        )
    }
}
