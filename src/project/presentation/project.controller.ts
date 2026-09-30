import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/infrastructure/passport/jwt-auth.guard.js';
import { CreateProjectDto } from '../application/dto/create-project.dto.js';
import { UpdateProjectDto } from '../application/dto/update-project.dto.js';
import { CreateProjectRequest } from '../application/requests/create-project.request.js';
import { CreateProjectResponse } from '../application/responses/create-project.response.js';
import type { ProjectResponse } from '../application/responses/project.response.js';
import { CreateProjectUseCase } from '../application/use-cases/create-project.use-case.js';
import { GetProjectsUseCase } from '../application/use-cases/get-projects.use-case.js';
import { UpdateProjectUseCase } from '../application/use-cases/update-project.use-case.js';
import { getSchemaPath, ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import {
    ApiSuccessResponseDoc,
    ProjectCreatedSchema,
    ProjectRepositorySchema,
    ProjectSchema,
} from '../../shared/presentation/swagger/api-response.schemas.js';

@ApiTags('Project')
@Controller('project')
export class ProjectController {
    constructor(
        private readonly createProjectUseCase: CreateProjectUseCase,
        private readonly getProjectsUseCase: GetProjectsUseCase,
        private readonly updateProjectUseCase: UpdateProjectUseCase,
    ) { }

    @Post('registry')
    @ApiOperation({ description: 'Crea un proyecto para analizar los dockers' })
    @ApiBody({ type: CreateProjectDto })
    @ApiSuccessResponseDoc({
        status: 201,
        description: 'Proyecto creado correctamente',
        dataSchema: { $ref: getSchemaPath(ProjectCreatedSchema) },
        extraModels: [ProjectCreatedSchema],
    })
    async registryProject(
        @Body() dto: CreateProjectDto,
    ): Promise<CreateProjectResponse> {
        return this.createProjectUseCase.execute(
            new CreateProjectRequest(dto.name, dto.description),
        );
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ description: 'Obtiene todos los repositorios asociados al usuario autenticado' })
    @ApiSuccessResponseDoc({
        status: 200,
        description: 'Proyectos del usuario',
        dataSchema: { type: 'array', items: { $ref: getSchemaPath(ProjectSchema) } },
        extraModels: [ProjectSchema, ProjectRepositorySchema],
    })
    @ApiUnauthorizedResponse({ description: 'No autenticado' })
    @ApiBearerAuth()
    async all(): Promise<ProjectResponse[]> {
        return this.getProjectsUseCase.execute();
    }

    @Post(':id/update')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ description: 'Actualiza el nombre y la descripcion de un proyecto' })
    @ApiParam({ name: 'id', type: Number, example: 1 })
    @ApiBody({ type: UpdateProjectDto })
    @ApiSuccessResponseDoc({
        status: 200,
        description: 'Proyecto actualizado correctamente',
        dataSchema: { $ref: getSchemaPath(ProjectSchema) },
        extraModels: [ProjectSchema, ProjectRepositorySchema],
    })
    @ApiUnauthorizedResponse({ description: 'No autorizado' })
    @ApiBearerAuth()
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateProjectDto,
    ): Promise<ProjectResponse> {
        return this.updateProjectUseCase.execute(id, dto.name, dto.description);
    }

}
