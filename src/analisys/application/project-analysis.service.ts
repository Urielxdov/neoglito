import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CloneRepositoryUseCase } from '../../repository/application/use-cases/repository/clone-repository.use-case.js';
import {
  COMPOSE_PORT_EXTRACT_PORT,
  type ComposePort,
  type ComposePortExtractPort,
} from '../../shared/application/compose-port-extract.port.js';
import {
  ENVIROMENT_VARIABLE_EXTRACT_PORT,
  type EnvironmentVariable,
  type EnviromentVariableExtractPort,
} from '../../shared/application/enviroment-variable-extract.port.js';
import {
  FILE_FINDER_PORT,
  type FileFinderPort,
} from '../../shared/application/file-finder.port.js';

export interface ProjectComposeFiles {
  clonedRepositoryPaths: string[];
  dockerFilesPath: string[];
}

export interface ProjectComposeAnalysis {
  dockerComposePath: string;
  environmentVariables: EnvironmentVariable[];
  ports: ComposePort[];
}

export interface ProjectAnalysis extends ProjectComposeFiles {
  composeAnalyses: ProjectComposeAnalysis[];
}

@Injectable()
export class ProjectAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloneRepository: CloneRepositoryUseCase,
    @Inject(FILE_FINDER_PORT)
    private readonly fileFinder: FileFinderPort,
    @Inject(ENVIROMENT_VARIABLE_EXTRACT_PORT)
    private readonly environmentExtractor: EnviromentVariableExtractPort,
    @Inject(COMPOSE_PORT_EXTRACT_PORT)
    private readonly portExtractor: ComposePortExtractPort,
  ) {}

  async getComposeFiles(
    userId: number,
    projectId: number,
  ): Promise<ProjectComposeFiles> {
    const clonedRepositoryPaths = await this.cloneProjectRepositories(
      userId,
      projectId,
    );
    const dockerFilesPath = (
      await Promise.all(
        clonedRepositoryPaths.map((path) => this.findComposeFiles(path)),
      )
    ).flat();

    return { clonedRepositoryPaths, dockerFilesPath };
  }

  async analyzeProject(
    userId: number,
    projectId: number,
    { includePorts = true }: { includePorts?: boolean } = {},
  ): Promise<ProjectAnalysis> {
    const files = await this.getComposeFiles(userId, projectId);
    const composeAnalyses = await this.analyzeComposeFiles(
      files.dockerFilesPath,
      includePorts,
    );

    return { ...files, composeAnalyses };
  }

  private async cloneProjectRepositories(
    userId: number,
    projectId: number,
  ): Promise<string[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { repositories: true },
    });
    if (!project) {
      throw new NotFoundException(
        `The project with id ${projectId} does not exist`,
      );
    }

    return Promise.all(
      project.repositories.map((repository) =>
        this.cloneRepository.execute(userId, { cloneUrl: repository.cloneUrl }),
      ),
    );
  }

  private findComposeFiles(repositoryPath: string): Promise<string[]> {
    return this.fileFinder.findFile(
      repositoryPath,
      /(^|\/)(docker-)?compose(\.[^/]+)?\.ya?ml$/,
    );
  }

  private analyzeComposeFiles(
    filePaths: readonly string[],
    includePorts: boolean,
  ): Promise<ProjectComposeAnalysis[]> {
    return Promise.all(
      filePaths.map(async (dockerComposePath) => {
        const [environmentAnalysis, portAnalysis] = await Promise.all([
          this.environmentExtractor.analyze(dockerComposePath),
          includePorts
            ? this.portExtractor.analyze(dockerComposePath)
            : { ports: [] },
        ]);

        return {
          dockerComposePath,
          environmentVariables: environmentAnalysis.environmentVariables,
          ports: portAnalysis.ports,
        };
      }),
    );
  }
}
