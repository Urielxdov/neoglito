import { Inject, Injectable } from "@nestjs/common";
import { PROJECT_REPOSITORY } from "../../domain/entities/project.repository.js";
import type { ProjectRepository } from "../../domain/entities/project.repository.js";
import { ProjectResponse } from "../responses/project.response.js";

@Injectable()
export class GetProjectsUseCase {
    constructor(
        @Inject(PROJECT_REPOSITORY)
        private readonly projectRepository: ProjectRepository,
    ) {}

    async execute(): Promise<ProjectResponse[]> {
        const projects = await this.projectRepository.findAll()

        return projects.map((project) => {
            if (project.id === undefined) {
                throw new Error("Project was persisted without an id")
            }

            return new ProjectResponse(
                project.id,
                project.name,
                project.description,
                project.createdAt.toISOString(),
                project.updatedAt.toISOString(),
                project.repositories,
            )
        })
    }
}
