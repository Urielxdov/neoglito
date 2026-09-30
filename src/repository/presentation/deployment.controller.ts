import {
  Body,
  Controller,
  Get,
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
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/passport/jwt-auth.guard.js';
import { ExtractEnvironmentVariablesUseCase } from '../../shared/application/extract-environment-variables.use-case.js';
import { YamlComposePortExtractService } from '../../shared/infrastructure/compose/yaml-compose-port-extract.service.js';
import type { AuthenticatedRequest } from '../../shared/presentation/http/authenticated-request.js';
import {
  ApiSuccessResponseDoc,
  ComposeAnalysisSchema,
  DeploymentSchema,
  DeploymentServiceSchema,
  EnvironmentVariableSchema,
  ProjectDockerFilesDataSchema,
  ProjectComposeAnalysisSchema,
  ComposePortSchema,
} from '../../shared/presentation/swagger/api-response.schemas.js';
import type { ProjectDockerFilesResponse } from '@neoglito/shared/repository';
import { DeployComposeDto } from '../application/dto/deploy-compose.dto.js';
import { ProjectComposeFilesDto } from '../application/dto/project-compose-files.dto.js';
import {
  DeployComposeUseCase,
  GetProjectDeploymentsUseCase,
  StopDeploymentUseCase,
} from '../application/use-cases/deploy-compose.use-case.js';
import { GetProjectComposeFilesUseCase } from '../application/use-cases/get-project-compose-files.use-case.js';

@ApiTags('Deployment')
@Controller('deployment')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'No autorizado' })
export class DeploymentController {
  constructor(
    private readonly getComposeFiles: GetProjectComposeFilesUseCase,
    private readonly extractEnvironmentVariables: ExtractEnvironmentVariablesUseCase,
    private readonly extractComposePorts: YamlComposePortExtractService,
    private readonly deployCompose: DeployComposeUseCase,
    private readonly getDeployments: GetProjectDeploymentsUseCase,
    private readonly stopDeployment: StopDeploymentUseCase,
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
    const result = await this.getComposeFiles.execute(
      request.user.id,
      dto.projectId,
    );
    const composeAnalyses = await Promise.all(
      result.dockerFilesPath.map(async (dockerComposePath) => {
        const [environmentAnalysis, portAnalysis] = await Promise.all([
          this.extractEnvironmentVariables.execute([dockerComposePath]),
          this.extractComposePorts.analyze(dockerComposePath),
        ]);

        return {
          dockerComposePath,
          environmentVariables:
            environmentAnalysis[0]?.environmentVariables ?? [],
          ports: portAnalysis.ports,
        };
      }),
    );
    return { ...result, composeAnalyses };
  }

  @Post()
  @ApiOperation({
    summary: 'Desplegar un archivo Compose',
    description:
      'Valida que el archivo Compose pertenezca al proyecto, construye las imágenes e inicia los contenedores.',
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
  ) {
    return this.deployCompose.execute(
      request.user.id,
      dto.projectId,
      dto.composePath,
    );
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
  async all(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.getDeployments.execute(projectId);
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
  async stop(@Param('deploymentId') deploymentId: string) {
    return this.stopDeployment.execute(deploymentId);
  }
}
