import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ContainerRuntimePort } from '../../container/application/container-runtime.port.js';
import { DeployComposeUseCase } from '../../deployment/application/use-cases/deploy-compose.use-case.js';
import { ProjectDeploymentController } from '../../deployment/presentation/deployment.controller.js';
import type { PortReservationPort } from '../../ports/application/port-reservation.port.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { CloneRepositoryUseCase } from '../../repository/application/use-cases/repository/clone-repository.use-case.js';
import type { ComposePort } from '../../shared/application/compose-port-extract.port.js';
import type { EnvironmentVariable } from '../../shared/application/enviroment-variable-extract.port.js';
import type { AuthenticatedRequest } from '../../shared/presentation/http/authenticated-request.js';
import { ProjectAnalysisService } from './project-analysis.service.js';

const USER_ID = 7;
const PROJECT_ID = 12;
const COMPOSE_PATHS = [
  '/repositories/api/docker-compose.yml',
  '/repositories/web/docker-compose.yml',
];
const ENVIRONMENT_VARIABLES: EnvironmentVariable[] = [
  {
    service: 'api',
    name: 'PORT',
    source: 'interpolation',
    value: 'PORT',
    defaultValue: '3000',
  },
];
const PORTS: ComposePort[] = [
  {
    service: 'api',
    hostIp: null,
    publishedPort: '8080',
    targetPort: '3000',
    protocol: 'tcp',
    mappingType: 'one-to-one',
  },
];

function setup(files: readonly string[] = ['docker-compose.yml']) {
  const prisma = {
    project: {
      findUnique: vi.fn(
        async (): Promise<{ repositories: { cloneUrl: string }[] } | null> => ({
          repositories: [
            { cloneUrl: 'https://github.com/acme/api.git' },
            { cloneUrl: 'https://github.com/acme/web.git' },
          ],
        }),
      ),
    },
  };
  const cloneRepository = {
    execute: vi.fn(
      async (_userId: number, { cloneUrl }: { cloneUrl: string }) =>
        cloneUrl.endsWith('/api.git')
          ? '/repositories/api'
          : '/repositories/web',
    ),
  };
  const fileFinder = {
    findFile: vi.fn(async (root: string, pattern: RegExp) =>
      files
        .filter((file) => pattern.test(file))
        .map((file) => `${root}/${file}`),
    ),
  };
  const environmentExtractor = {
    analyze: vi.fn(async (_filePath: string) => ({
      environmentVariables: ENVIRONMENT_VARIABLES,
    })),
  };
  const portExtractor = {
    analyze: vi.fn(async (_filePath: string) => ({ ports: PORTS })),
  };

  return {
    service: new ProjectAnalysisService(
      prisma as unknown as PrismaService,
      cloneRepository as unknown as CloneRepositoryUseCase,
      fileFinder,
      environmentExtractor,
      portExtractor,
    ),
    prisma,
    cloneRepository,
    fileFinder,
    environmentExtractor,
    portExtractor,
  };
}

describe('ProjectAnalysisService', () => {
  it('discovers the supported Compose files without analyzing them', async () => {
    const {
      service,
      prisma,
      cloneRepository,
      environmentExtractor,
      portExtractor,
    } = setup([
      'docker-compose.yml',
      'docker-compose.prod.yml',
      'apps/api/docker-compose.local.yml',
      'apps/api/docker-compose.yaml',
      'apps/web/compose.yml',
      'apps/web/my-docker-compose.yml',
    ]);

    const result = await service.getComposeFiles(USER_ID, PROJECT_ID);

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: PROJECT_ID },
      include: { repositories: true },
    });
    expect(cloneRepository.execute).toHaveBeenCalledWith(USER_ID, {
      cloneUrl: 'https://github.com/acme/api.git',
    });
    expect(cloneRepository.execute).toHaveBeenCalledWith(USER_ID, {
      cloneUrl: 'https://github.com/acme/web.git',
    });
    expect(result).toEqual({
      clonedRepositoryPaths: ['/repositories/api', '/repositories/web'],
      dockerFilesPath: [
        '/repositories/api/docker-compose.yml',
        '/repositories/api/docker-compose.prod.yml',
        '/repositories/api/apps/api/docker-compose.local.yml',
        '/repositories/web/docker-compose.yml',
        '/repositories/web/docker-compose.prod.yml',
        '/repositories/web/apps/api/docker-compose.local.yml',
      ],
    });
    expect(environmentExtractor.analyze).not.toHaveBeenCalled();
    expect(portExtractor.analyze).not.toHaveBeenCalled();
  });

  it('analyzes variables and ports for every discovered Compose file', async () => {
    const { service, environmentExtractor, portExtractor } = setup();

    const result = await service.analyzeProject(USER_ID, PROJECT_ID);

    expect(result).toEqual({
      clonedRepositoryPaths: ['/repositories/api', '/repositories/web'],
      dockerFilesPath: COMPOSE_PATHS,
      composeAnalyses: COMPOSE_PATHS.map((dockerComposePath) => ({
        dockerComposePath,
        environmentVariables: ENVIRONMENT_VARIABLES,
        ports: PORTS,
      })),
    });
    expect(environmentExtractor.analyze.mock.calls).toEqual(
      COMPOSE_PATHS.map((path) => [path]),
    );
    expect(portExtractor.analyze.mock.calls).toEqual(
      COMPOSE_PATHS.map((path) => [path]),
    );
  });

  it('can analyze variables without invoking the port extractor', async () => {
    const { service, environmentExtractor, portExtractor } = setup();

    const result = await service.analyzeProject(USER_ID, PROJECT_ID, {
      includePorts: false,
    });

    expect(result.composeAnalyses).toEqual(
      COMPOSE_PATHS.map((dockerComposePath) => ({
        dockerComposePath,
        environmentVariables: ENVIRONMENT_VARIABLES,
        ports: [],
      })),
    );
    expect(environmentExtractor.analyze).toHaveBeenCalledTimes(2);
    expect(portExtractor.analyze).not.toHaveBeenCalled();
  });

  it('returns empty results when a project has no repositories', async () => {
    const {
      service,
      prisma,
      cloneRepository,
      fileFinder,
      environmentExtractor,
      portExtractor,
    } = setup();
    prisma.project.findUnique.mockResolvedValueOnce({ repositories: [] });

    await expect(service.analyzeProject(USER_ID, PROJECT_ID)).resolves.toEqual({
      clonedRepositoryPaths: [],
      dockerFilesPath: [],
      composeAnalyses: [],
    });
    expect(cloneRepository.execute).not.toHaveBeenCalled();
    expect(fileFinder.findFile).not.toHaveBeenCalled();
    expect(environmentExtractor.analyze).not.toHaveBeenCalled();
    expect(portExtractor.analyze).not.toHaveBeenCalled();
  });

  it('rejects a missing project before cloning or searching files', async () => {
    const { service, prisma, cloneRepository, fileFinder } = setup();
    prisma.project.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.analyzeProject(USER_ID, PROJECT_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(cloneRepository.execute).not.toHaveBeenCalled();
    expect(fileFinder.findFile).not.toHaveBeenCalled();
  });

  it('propagates cloning failures before searching files', async () => {
    const { service, cloneRepository, fileFinder } = setup();
    const error = new Error('Clone failed');
    cloneRepository.execute.mockRejectedValueOnce(error);

    await expect(service.getComposeFiles(USER_ID, PROJECT_ID)).rejects.toBe(
      error,
    );
    expect(fileFinder.findFile).not.toHaveBeenCalled();
  });

  it('propagates extraction failures instead of returning partial analysis', async () => {
    const { service, environmentExtractor } = setup();
    const error = new Error('Invalid Compose');
    environmentExtractor.analyze.mockRejectedValueOnce(error);

    await expect(service.analyzeProject(USER_ID, PROJECT_ID)).rejects.toBe(
      error,
    );
  });
});

describe('analysis consumers', () => {
  const request = { user: { id: USER_ID } } as AuthenticatedRequest;

  it('preserves the project init response and skips port extraction', async () => {
    const { service, portExtractor } = setup();
    const controller = new ProjectDeploymentController(service);

    await expect(
      controller.initProject(request, { projectId: PROJECT_ID }),
    ).resolves.toEqual({
      clonedRepositoryPaths: ['/repositories/api', '/repositories/web'],
      dockerComposePaths: COMPOSE_PATHS,
      composeAnalyses: COMPOSE_PATHS.map((dockerComposePath) => ({
        dockerComposePath,
        environmentVariables: ENVIRONMENT_VARIABLES,
      })),
    });
    expect(portExtractor.analyze).not.toHaveBeenCalled();
  });

  it('rejects deployment of a Compose file outside the project', async () => {
    const { service, prisma, environmentExtractor, portExtractor } = setup();
    const deploy = new DeployComposeUseCase(
      prisma as unknown as PrismaService,
      service,
      {} as ContainerRuntimePort,
      {} as PortReservationPort,
      { prepare: vi.fn() },
    );

    await expect(
      deploy.execute(USER_ID, PROJECT_ID, '/other/docker-compose.yml'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(environmentExtractor.analyze).not.toHaveBeenCalled();
    expect(portExtractor.analyze).not.toHaveBeenCalled();
  });
});
