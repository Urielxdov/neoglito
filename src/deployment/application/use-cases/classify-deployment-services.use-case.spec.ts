import { ConflictException, NotFoundException } from '@nestjs/common';
import { resolve } from 'node:path';
import type {
  ContainerInspection,
  ContainerRuntimePort,
  ContainerRuntimeService,
} from '../../../container/application/container-runtime.port.js';
import type { Classification } from '../../../ports/application/container-classification.port.js';
import { ContainerClassificationService } from '../../../ports/infrastructure/classification/container-classification.service.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import { ServiceType as T } from '../../domain/value-objects/service-type.js';
import { ClassifyDeploymentServicesUseCase } from './classify-deployment-services.use-case.js';

const DEPLOYMENT_ID = '0dc6bf1b-0041-4f56-9d2e-8fe08d8c00e1';

function storedService(id: string, port: number) {
  return {
    id,
    composeServiceName: id,
    port,
    status: 'running' as const,
    health: 'none' as const,
    serviceType: T.BACKEND,
    lastObservedAt: new Date('2026-10-01T00:00:00Z'),
    deploymentId: DEPLOYMENT_ID,
  };
}

function observedContainer(
  containerId: string,
  port: number,
  status: ContainerRuntimeService['status'] = 'running',
): ContainerRuntimeService {
  return {
    containerId,
    composeServiceName: containerId,
    port,
    status,
    health: 'healthy',
  };
}

function setup(
  observed: ContainerRuntimeService[],
  results: Record<string, Classification> = {},
) {
  const services = [storedService('db', 5432), storedService('api', 8080)];
  const deployment = {
    id: DEPLOYMENT_ID,
    projectId: 1,
    composePath: '/repos/demo/docker-compose.yml',
    status: 'running' as const,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    startedAt: null,
    finishedAt: null,
    services,
  };
  const updates: Array<{
    where: { id: string };
    data: Record<string, unknown>;
  }> = [];
  const prisma = {
    deployment: {
      findUnique: vi.fn(async () => deployment),
      findUniqueOrThrow: vi.fn(async () => ({
        ...deployment,
        services: deployment.services.map((service) => ({
          ...service,
          ...updates.find((update) => update.where.id === service.id)?.data,
        })),
      })),
    },
    deploymentService: {
      update: vi.fn((args: (typeof updates)[number]) => {
        updates.push(args);
        return args;
      }),
    },
    $transaction: vi.fn(async (operations: unknown[]) => operations),
  };
  const inspections: ContainerInspection[] = observed.map((container) => ({
    containerId: container.containerId,
    image: 'custom/app:1',
    aliases: [container.composeServiceName],
    ports: container.port > 0 ? [container.port] : [],
    command: [],
    env: {},
  }));
  const runtime = {
    list: vi.fn(async () => observed),
    inspect: vi.fn(async () => inspections),
  };
  const classifier = {
    classify: vi.fn(async (containers: readonly ContainerInspection[]) =>
      containers.map((container) => ({
        containerId: container.containerId,
        classification: results[container.containerId] ?? {
          kind: 'unknown' as const,
          evidence: [],
        },
      })),
    ),
  };
  return {
    useCase: new ClassifyDeploymentServicesUseCase(
      prisma as unknown as PrismaService,
      runtime as unknown as ContainerRuntimePort,
      classifier,
    ),
    prisma,
    runtime,
    classifier,
    inspections,
    deployment,
  };
}

describe('ClassifyDeploymentServicesUseCase', () => {
  it('observes the saved configuration using the independent project name', async () => {
    const { useCase, deployment, runtime } = setup([
      observedContainer('db', 15432),
      observedContainer('api', 13000),
    ]);
    deployment.composePath = resolve(
      `/repos/demo/.neoglito-${DEPLOYMENT_ID}.compose.yml`,
    );
    await useCase.execute(DEPLOYMENT_ID);
    expect(runtime.list).toHaveBeenCalledExactlyOnceWith(
      resolve('/repos/demo'),
      deployment.composePath,
      `neoglito-${DEPLOYMENT_ID}`,
    );
  });
  it('inspects the deployment, classifies it and stores resolved types and observed state', async () => {
    const { useCase, runtime, classifier, inspections, prisma } = setup(
      [observedContainer('db', 5432), observedContainer('api', 9090)],
      {
        db: {
          kind: 'resolved',
          type: T.DATABASE,
          evidence: ['imagen: postgres'],
        },
        api: {
          kind: 'resolved',
          type: T.BACKEND,
          evidence: ['huella HTTP: gunicorn'],
        },
      },
    );
    const result = await useCase.execute(DEPLOYMENT_ID);
    expect(runtime.inspect).toHaveBeenCalledWith(['db', 'api']);
    expect(classifier.classify).toHaveBeenCalledWith(inspections);
    expect(
      result.services.map((service) => [
        service.id,
        service.serviceType,
        service.port,
      ]),
    ).toEqual([
      ['db', T.DATABASE, 5432],
      ['api', T.BACKEND, 9090],
    ]);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.deploymentService.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'api' },
        data: expect.objectContaining({
          status: 'running',
          health: 'healthy',
          lastObservedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('allows a worker without a published port', async () => {
    const { useCase, classifier, inspections } = setup(
      [observedContainer('db', 5432), observedContainer('api', 0)],
      {
        api: {
          kind: 'resolved',
          type: T.WORKER,
          evidence: ['comando: celery worker'],
        },
      },
    );
    const result = await useCase.execute(DEPLOYMENT_ID);
    expect(inspections[1].ports).toEqual([]);
    expect(classifier.classify).toHaveBeenCalledOnce();
    expect(result.services[1]).toMatchObject({
      port: 0,
      serviceType: T.WORKER,
    });
  });

  it('persists broker and worker types from the real classification chain', async () => {
    const { useCase, classifier, inspections, runtime } = setup([
      observedContainer('db', 0),
      observedContainer('api', 0),
    ]);
    inspections[0] = {
      containerId: 'db',
      image: 'redis:7',
      aliases: ['redis'],
      ports: [],
      command: ['redis-server'],
      env: {},
    };
    inspections[1] = {
      containerId: 'api',
      image: 'custom/app',
      aliases: ['worker'],
      ports: [],
      command: ['celery', 'worker'],
      env: { CELERY_BROKER_URL: 'redis://redis:6379/0' },
    };
    const probe = { probe: vi.fn() };
    const service = new ContainerClassificationService(
      probe,
      runtime as unknown as ContainerRuntimePort,
    );
    vi.mocked(classifier.classify).mockImplementation((containers) =>
      service.classify(containers),
    );
    const result = await useCase.execute(DEPLOYMENT_ID);
    expect(result.services.map((container) => container.serviceType)).toEqual([
      T.MESSAGE_BROKER,
      T.WORKER,
    ]);
    expect(probe.probe).not.toHaveBeenCalled();
  });

  it.each(['ambiguous', 'conflict', 'unknown'] as const)(
    'stores UNKNOWN for %s instead of choosing a candidate',
    async (kind) => {
      const classification: Classification =
        kind === 'unknown'
          ? { kind, evidence: [] }
          : {
              kind,
              candidates: [T.CACHE, T.MESSAGE_BROKER],
              evidence: ['resp'],
            };
      const { useCase } = setup(
        [observedContainer('db', 5432), observedContainer('api', 8080)],
        { db: classification },
      );
      expect(
        (await useCase.execute(DEPLOYMENT_ID)).services[0].serviceType,
      ).toBe(T.UNKNOWN);
    },
  );

  it('rejects stopped containers before inspecting or classifying', async () => {
    const { useCase, classifier, runtime, prisma } = setup([
      observedContainer('db', 5432),
      observedContainer('api', 8080, 'exited'),
    ]);
    await expect(useCase.execute(DEPLOYMENT_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(runtime.inspect).not.toHaveBeenCalled();
    expect(classifier.classify).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a missing container', async () => {
    const { useCase, classifier } = setup([observedContainer('db', 5432)]);
    await expect(useCase.execute(DEPLOYMENT_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(classifier.classify).not.toHaveBeenCalled();
  });

  it('rejects incomplete inspection before writing', async () => {
    const { useCase, runtime, inspections, prisma } = setup([
      observedContainer('db', 5432),
      observedContainer('api', 8080),
    ]);
    vi.mocked(runtime.inspect).mockResolvedValueOnce([inspections[0]]);
    await expect(useCase.execute(DEPLOYMENT_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.deploymentService.update).not.toHaveBeenCalled();
  });

  it('reports failed Docker inspection without writing partial results', async () => {
    const { useCase, runtime, prisma } = setup([
      observedContainer('db', 5432),
      observedContainer('api', 8080),
    ]);
    vi.mocked(runtime.inspect).mockRejectedValueOnce(
      new Error('Docker unavailable'),
    );
    await expect(useCase.execute(DEPLOYMENT_ID)).rejects.toThrow(
      'Docker unavailable',
    );
    expect(prisma.deploymentService.update).not.toHaveBeenCalled();
  });

  it('rejects an incomplete classification before writing', async () => {
    const { useCase, classifier, prisma } = setup([
      observedContainer('db', 5432),
      observedContainer('api', 8080),
    ]);
    vi.mocked(classifier.classify).mockResolvedValueOnce([]);
    await expect(useCase.execute(DEPLOYMENT_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.deploymentService.update).not.toHaveBeenCalled();
  });

  it('rejects an empty deployment', async () => {
    const { useCase, deployment, runtime } = setup([]);
    deployment.services = [];
    await expect(useCase.execute(DEPLOYMENT_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(runtime.list).not.toHaveBeenCalled();
  });

  it('fails when the deployment does not exist', async () => {
    const { useCase, prisma } = setup([]);
    vi.mocked(prisma.deployment.findUnique).mockResolvedValueOnce(
      null as never,
    );
    await expect(useCase.execute(DEPLOYMENT_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
