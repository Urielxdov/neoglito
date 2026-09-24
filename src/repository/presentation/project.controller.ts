import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CreateProjectDto } from "../application/dto/create-project.dto.js";
import { CreateProjectRequest } from "../application/requests/create-project.request.js";
import { CreateProjectResponse } from "../application/responses/create-project.response.js";
import { CreateProjectUseCase } from "../application/use-cases/create-project.use-case.js";
import { GetProjectsUseCase } from "../application/use-cases/get-projects.use-case.js";
import type { ProjectResponse } from "../application/responses/project.response.js";
import { JwtAuthGuard } from "../../auth/infrastructure/passport/jwt-auth.guard.js";


@Controller('project')
export class ProjectController {
    constructor(
        private readonly createProjectUseCase: CreateProjectUseCase,
        private readonly getProjectsUseCase: GetProjectsUseCase,
    ) {}

    @Post('registry')
    async registryProject(
        @Body() dto: CreateProjectDto,
    ): Promise<CreateProjectResponse> {
        return this.createProjectUseCase.execute(
            new CreateProjectRequest(dto.name, dto.description),
        )
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async all(): Promise<ProjectResponse[]> {
        return this.getProjectsUseCase.execute()
    }
}
