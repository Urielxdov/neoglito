import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/passport/jwt-auth.guard.js';
import { ProjectAnalysisService } from '../../analisys/application/project-analysis.service.js';
import type { AuthenticatedRequest } from '../../shared/presentation/http/authenticated-request.js';
import type {
  DeploymentResponse,
  DeploymentPortsResponse,
  InitProjectResponse,
  ProjectDockerFilesResponse,
} from '@neoglito/shared/repository';
import { toDeploymentResponse } from '../application/responses/deployment.response.js';
import {
  ApiSuccessResponseDoc,
  ComposeAnalysisSchema,
  DeploymentSchema,
  DeploymentServiceSchema,
  EnvironmentVariableSchema,
  InitProjectDataSchema,
  ProjectDockerFilesDataSchema,
  ProjectComposeAnalysisSchema,
  ComposePortSchema,
} from '../../shared/presentation/swagger/api-response.schemas.js';
import { DeployComposeDto } from '../application/dto/deploy-compose.dto.js';
import { InitProjectDto } from '../application/dto/init-project.dto.js';
import { ProjectComposeFilesDto } from '../application/dto/project-compose-files.dto.js';
import {
  DeployComposeUseCase,
  GetProjectDeploymentsUseCase,
  StopDeploymentUseCase,
} from '../application/use-cases/deploy-compose.use-case.js';
import { ClassifyDeploymentServicesUseCase } from '../application/use-cases/classify-deployment-services.use-case.js';
import { GetDeploymentPortsUseCase } from '../application/use-cases/get-deployment-ports.use-case.js';

@ApiTags('Deployment')
@Controller('deployment')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'No autorizado' })
export class DeploymentController {
  private readonly logger = new Logger(DeploymentController.name);

  constructor(
    private readonly projectAnalysis: ProjectAnalysisService,
    private readonly deployCompose: DeployComposeUseCase,
    private readonly getDeployments: GetProjectDeploymentsUseCase,
    private readonly stopDeployment: StopDeploymentUseCase,
    private readonly classifyServices: ClassifyDeploymentServicesUseCase,
    private readonly getDeploymentPorts: GetDeploymentPortsUseCase,
  ) {}

  @Post('docker_files')
  @ApiOperation({
    summary: 'Buscar archivos Compose',
    description:
      'Clona los repositorios del proyecto si es necesario y devuelve sus archivos Compose y análisis de variables de entorno.',
  })
  @ApiBody({ type: ProjectComposeFilesDto })
  @ApiSuccessResponseDoc({
    status: 200,
    description: 'Archivos Compose encontrados',
    dataSchema: { $ref: getSchemaPath(ProjectDockerFilesDataSchema) },
    extraModels: [
      ProjectDockerFilesDataSchema,
      ComposeAnalysisSchema,
      EnvironmentVariableSchema,
      ProjectComposeAnalysisSchema,
      ComposePortSchema,
    ],
  })
  async dockerFilesPaths(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ProjectComposeFilesDto,
  ): Promise<ProjectDockerFilesResponse> {
    return this.projectAnalysis.analyzeProject(request.user.id, dto.projectId);
  }

  @Post()
  @ApiOperation({
    summary: 'Desplegar un archivo Compose',
    description:
      'Valida el archivo del proyecto, aplica los puertos y variables recibidos al YAML de un despliegue independiente, construye las imágenes e inicia los contenedores.',
  })
  @ApiBody({ type: DeployComposeDto })
  @ApiBadRequestResponse({
    description: 'El archivo Compose no pertenece al proyecto seleccionado',
  })
  @ApiNotFoundResponse({ description: 'El proyecto no existe' })
  @ApiSuccessResponseDoc({
    status: 201,
    description: 'Despliegue iniciado y contenedores observados',
    dataSchema: { $ref: getSchemaPath(DeploymentSchema) },
    extraModels: [DeploymentSchema, DeploymentServiceSchema],
  })
  async deploy(
    @Req() request: AuthenticatedRequest,
    @Body() dto: DeployComposeDto,
  ): Promise<DeploymentResponse> {
    this.logger.log(
      `[deployment:backend] POST /deployment recibido ${JSON.stringify({ projectId: dto.projectId, composePath: dto.composePath, mirrorPorts: dto.mirrorPorts, receivedFields: Object.keys(dto), ports: dto.ports, environment: Array.isArray(dto.environment) ? dto.environment.map((variable) => ({ service: variable?.service, key: variable?.key })) : undefined })}`,
    );
    const deployment = await this.deployCompose.execute(
      request.user.id,
      dto.projectId,
      dto.composePath,
      {
        environment: dto.environment,
        ports: dto.ports,
        mirrorPorts: dto.mirrorPorts,
      },
    );
    return toDeploymentResponse(deployment);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Listar despliegues del proyecto' })
  @ApiParam({ name: 'projectId', type: Number, example: 1 })
  @ApiNotFoundResponse({ description: 'El proyecto no existe' })
  @ApiSuccessResponseDoc({
    status: 200,
    description: 'Despliegues registrados para el proyecto',
    dataSchema: {
      type: 'array',
      items: { $ref: getSchemaPath(DeploymentSchema) },
    },
    extraModels: [DeploymentSchema, DeploymentServiceSchema],
  })
  async all(
    @Param('projectId', ParseIntPipe) projectId: number,
  ): Promise<DeploymentResponse[]> {
    const deployments = await this.getDeployments.execute(projectId);
    return deployments.map(toDeploymentResponse);
  }

  @Get(':deploymentId/ports')
  @ApiOperation({
    summary: 'Consultar puertos asignados a los contenedores del despliegue',
  })
  @ApiParam({ name: 'deploymentId', format: 'uuid' })
  @ApiNotFoundResponse({ description: 'El despliegue no existe' })
  @ApiSuccessResponseDoc({
    status: 200,
    description:
      'Puertos guardados para el despliegue; null cuando no existe una asignación activa',
    dataSchema: {
      type: 'object',
      required: [
        'deploymentId',
        'projectId',
        'status',
        'sourceComposePath',
        'projectDirectory',
        'services',
      ],
      properties: {
        deploymentId: { type: 'string', format: 'uuid' },
        projectId: { type: 'integer' },
        status: { type: 'string' },
        sourceComposePath: { type: 'string', nullable: true },
        projectDirectory: { type: 'string', nullable: true },
        services: {
          type: 'array',
          items: {
            type: 'object',
            required: ['containerId', 'composeServiceName', 'port'],
            properties: {
              containerId: { type: 'string' },
              composeServiceName: { type: 'string' },
              port: { type: 'integer', nullable: true, example: 3002 },
            },
          },
        },
      },
    },
  })
  async ports(
    @Param('deploymentId') deploymentId: string,
  ): Promise<DeploymentPortsResponse> {
    return this.getDeploymentPorts.execute(deploymentId);
  }

  @Post(':deploymentId/stop')
  @ApiOperation({
    summary: 'Detener un despliegue',
    description:
      'Ejecuta `docker compose down` y actualiza el estado del despliegue y sus contenedores.',
  })
  @ApiParam({
    name: 'deploymentId',
    format: 'uuid',
    example: '0dc6bf1b-0041-4f56-9d2e-8fe08d8c00e1',
  })
  @ApiNotFoundResponse({ description: 'El despliegue no existe' })
  @ApiSuccessResponseDoc({
    status: 200,
    description: 'Despliegue detenido',
    dataSchema: { $ref: getSchemaPath(DeploymentSchema) },
    extraModels: [DeploymentSchema, DeploymentServiceSchema],
  })
  async stop(
    @Param('deploymentId') deploymentId: string,
  ): Promise<DeploymentResponse> {
    return toDeploymentResponse(
      await this.stopDeployment.execute(deploymentId),
    );
  }

  @Post(':deploymentId/classify')
  @ApiOperation({
    summary: 'Identificar la categoría de los contenedores',
    description:
      'Clasifica los contenedores por imagen, protocolo, configuración, comando y uso por otros servicios. Guarda el tipo resuelto o UNKNOWN cuando no puede determinarlo. Todos los contenedores deben estar en running; pueden no publicar puertos.',
  })
  @ApiParam({
    name: 'deploymentId',
    format: 'uuid',
    example: '0dc6bf1b-0041-4f56-9d2e-8fe08d8c00e1',
  })
  @ApiNotFoundResponse({ description: 'El despliegue no existe' })
  @ApiConflictResponse({
    description:
      'El despliegue no tiene contenedores, alguno no está en running o no se pudo observar o inspeccionar',
  })
  @ApiSuccessResponseDoc({
    status: 201,
    description: 'Contenedores clasificados',
    dataSchema: { $ref: getSchemaPath(DeploymentSchema) },
    extraModels: [DeploymentSchema, DeploymentServiceSchema],
  })
  async classify(
    @Param('deploymentId') deploymentId: string,
  ): Promise<DeploymentResponse> {
    this.logger.log(
      `[deployment:backend] POST classify recibido ${JSON.stringify({ deploymentId })}`,
    );
    return toDeploymentResponse(
      await this.classifyServices.execute(deploymentId),
    );
  }
}

@ApiTags('Project')
@Controller('project')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'No autorizado' })
export class ProjectDeploymentController {
  constructor(private readonly projectAnalysis: ProjectAnalysisService) {}

  @Post('init')
  @ApiOperation({ description: 'Inicializa el analisis de un proyecto' })
  @ApiBody({ type: InitProjectDto })
  @ApiSuccessResponseDoc({
    status: 200,
    description: 'Analisis inicializado correctamente',
    dataSchema: { $ref: getSchemaPath(InitProjectDataSchema) },
    extraModels: [
      InitProjectDataSchema,
      ComposeAnalysisSchema,
      EnvironmentVariableSchema,
    ],
  })
  async initProject(
    @Req() request: AuthenticatedRequest,
    @Body() dto: InitProjectDto,
  ): Promise<InitProjectResponse> {
    const result = await this.projectAnalysis.analyzeProject(
      request.user.id,
      dto.projectId,
      { includePorts: false },
    );

    return {
      clonedRepositoryPaths: result.clonedRepositoryPaths,
      dockerComposePaths: result.dockerFilesPath,
      composeAnalyses: result.composeAnalyses.map(
        ({ dockerComposePath, environmentVariables }) => ({
          dockerComposePath,
          environmentVariables,
        }),
      ),
    };
  }
}
