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

@Controller('project')
export class ProjectController {
  constructor(
    private readonly createProjectUseCase: CreateProjectUseCase,
    private readonly getProjectsUseCase: GetProjectsUseCase,
    private readonly cloneRepositoriesUseCase: CloneRepositoriesUseCase,
    private readonly initDeployProjectUseCase: InitDeployProjectUseCase,
    private readonly extractEnvironmentVariablesUseCase: ExtractEnvironmentVariablesUseCase,
  ) {}

  @Post('registry')
  async registryProject(
    @Body() dto: CreateProjectDto,
  ): Promise<CreateProjectResponse> {
    return this.createProjectUseCase.execute(
      new CreateProjectRequest(dto.name, dto.description),
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async all(): Promise<ProjectResponse[]> {
    return this.getProjectsUseCase.execute();
  }

  @Post('init')
  @UseGuards(JwtAuthGuard)
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
