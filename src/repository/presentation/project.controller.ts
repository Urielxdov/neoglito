import { Body, Controller, Get, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { CreateProjectDto } from "../application/dto/create-project.dto.js";
import { CreateProjectRequest } from "../application/requests/create-project.request.js";
import { CreateProjectResponse } from "../application/responses/create-project.response.js";
import { CreateProjectUseCase } from "../application/use-cases/create-project.use-case.js";
import { GetProjectsUseCase } from "../application/use-cases/get-projects.use-case.js";
import { CloneRepositoriesUseCase } from "../application/use-cases/clone-repositories.use-case.js";
import type { ProjectResponse } from "../application/responses/project.response.js";
import { JwtAuthGuard } from "../../auth/infrastructure/passport/jwt-auth.guard.js";
import type { AuthenticatedRequest } from "../../shared/presentation/http/authenticated-request.js";


@Controller('project')
export class ProjectController {
    constructor(
        private readonly createProjectUseCase: CreateProjectUseCase,
        private readonly getProjectsUseCase: GetProjectsUseCase,
        private readonly cloneRepositoriesUseCase: CloneRepositoriesUseCase,
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

    @Post('init_project')
    @UseGuards(JwtAuthGuard)
    async initProject(
        @Req() request: AuthenticatedRequest,
        @Body('projectId', ParseIntPipe) projectId: number,
    ): Promise<string[]> {
        return this.cloneRepositoriesUseCase.execute(request.user.id, projectId)
    }
}
