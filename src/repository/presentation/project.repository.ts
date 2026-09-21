import { Body, Controller, Post } from "@nestjs/common";
import { CreateProjectDto } from "../application/dto/create-project.dto.js";
import { CreateProjectRequest } from "../application/requests/create-project.request.js";
import { CreateProjectResponse } from "../application/responses/create-project.response.js";
import { CreateProjectUseCase } from "../application/use-cases/create-project.use-case.js";


@Controller('project')
export class ProjectController {
    constructor(private readonly createProjectUseCase: CreateProjectUseCase) {}

    @Post('registry')
    async registryProject(
        @Body() dto: CreateProjectDto,
    ): Promise<CreateProjectResponse> {
        return this.createProjectUseCase.execute(
            new CreateProjectRequest(dto.name, dto.description),
        )
    }
}
