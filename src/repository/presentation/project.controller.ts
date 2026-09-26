import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/infrastructure/passport/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../../shared/presentation/http/authenticated-request.js';
import { CreateProjectDto } from '../application/dto/create-project.dto.js';
import { InitProjectDto } from '../application/dto/init-project.dto.js';
import { CreateProjectRequest } from '../application/requests/create-project.request.js';
import { CreateProjectResponse } from '../application/responses/create-project.response.js';
import type { ProjectResponse } from '../application/responses/project.response.js';
import { CloneRepositoriesUseCase } from '../application/use-cases/clone-repositories.use-case.js';
import { CreateProjectUseCase } from '../application/use-cases/create-project.use-case.js';
import { GetProjectsUseCase } from '../application/use-cases/get-projects.use-case.js';
import { InitDeployProjectUseCase } from '../application/use-cases/init-deploy-project.use-case.js';
import type {
    InitProjectResponse,
    ProjectDockerFilesResponse,
} from '@neoglito/shared/repository';
import { ExtractEnvironmentVariablesUseCase } from '../../shared/application/extract-environment-variables.use-case.js';
import { getSchemaPath, ApiBearerAuth, ApiBody, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import {
    ApiSuccessResponseDoc,
    ComposeAnalysisSchema,
    EnvironmentVariableSchema,
    InitProjectDataSchema,
    ProjectCreatedSchema,
    ProjectDockerFilesDataSchema,
    ProjectRepositorySchema,
    ProjectSchema,
} from '../../shared/presentation/swagger/api-response.schemas.js';

@ApiTags('Project')
@Controller('project')
export class ProjectController {
    constructor(
        private readonly createProjectUseCase: CreateProjectUseCase,
        private readonly getProjectsUseCase: GetProjectsUseCase,
        private readonly cloneRepositoriesUseCase: CloneRepositoriesUseCase,
        private readonly initDeployProjectUseCase: InitDeployProjectUseCase,
        private readonly extractEnvironmentVariablesUseCase: ExtractEnvironmentVariablesUseCase,
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

    @Post('init')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ description: 'Inicializa el analisis de un proyecto' })
    @ApiBody({ type: InitProjectDto })
    @ApiSuccessResponseDoc({
        status: 200,
        description: 'Analisis inicializado correctamente',
        dataSchema: { $ref: getSchemaPath(InitProjectDataSchema) },
        extraModels: [InitProjectDataSchema, ComposeAnalysisSchema, EnvironmentVariableSchema],
    })
    @ApiUnauthorizedResponse({ description: 'No autorizado' })
    @ApiBearerAuth()
    async initProject(
        @Req() request: AuthenticatedRequest,
        @Body() dto: InitProjectDto,
    ): Promise<InitProjectResponse> {
        const clonedRepositoryPaths = await this.cloneRepositoriesUseCase.execute(
            request.user.id,
            dto.projectId,
        );
        const dockerComposePaths = (
            await Promise.all(
                clonedRepositoryPaths.map((repositoryPath) =>
                    this.initDeployProjectUseCase.execute(repositoryPath),
                ),
            )
        ).flat();
        const composeAnalyses = (
            await this.extractEnvironmentVariablesUseCase.execute(dockerComposePaths)
        ).map((analysis) => ({
            dockerComposePath: analysis.filePath,
            environmentVariables: analysis.environmentVariables,
        }));

        return {
            clonedRepositoryPaths,
            dockerComposePaths,
            composeAnalyses,
        };
    }

    @Post('docker_files')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ description: 'Busca las rutas de los dockers dentro del repositorio clonado' })
    @ApiBody({ type: InitProjectDto })
    @ApiUnauthorizedResponse({ description: 'Usuario no autorizado' })
    @ApiSuccessResponseDoc({
        status: 200,
        description: 'Rutas de archivos Docker encontradas',
        dataSchema: { $ref: getSchemaPath(ProjectDockerFilesDataSchema) },
        extraModels: [ProjectDockerFilesDataSchema, ComposeAnalysisSchema, EnvironmentVariableSchema],
    })
    @ApiBearerAuth()
    async dockerFilesPaths(
        @Req() request: AuthenticatedRequest,
        @Body() dto: InitProjectDto,
    ): Promise<ProjectDockerFilesResponse> {
        const clonedRepositoryPaths = await this.cloneRepositoriesUseCase.execute(
            request.user.id,
            dto.projectId,
        );
        const dockerFilesPath = (
            await Promise.all(
                clonedRepositoryPaths.map((repositoryPath) =>
                    this.initDeployProjectUseCase.execute(repositoryPath),
                ),
            )
        ).flat();
        const composeAnalyses = (
            await this.extractEnvironmentVariablesUseCase.execute(dockerFilesPath)
        ).map((analysis) => ({
            dockerComposePath: analysis.filePath,
            environmentVariables: analysis.environmentVariables,
        }));

        return {
            clonedRepositoryPaths,
            dockerFilesPath,
            composeAnalyses,
        };
    }
}
