import { ConflictException, NotFoundException } from '@nestjs/common';
import type {
  ContainerRuntimePort,
  ContainerRuntimeService,
} from '../../../container/application/container-runtime.port.js';
import type { ContainerProbePort } from '../../../ports/application/container-probe.port.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import { resolveServiceType } from '../../domain/services/protocol-service-type.js';
import { ClassifyDeploymentServicesUseCase } from './classify-deployment-services.use-case.js';

const DEPLOYMENT_ID = '0dc6bf1b-0041-4f56-9d2e-8fe08d8c00e1';

function storedService(id: string, composeServiceName: string, port: number) {
  return {
    id,
    composeServiceName,
    port,
    status: 'running' as const,
    health: 'none' as const,
    serviceType: 'UNKNOWN' as const,
    lastObservedAt: new Date('2026-10-01T00:00:00Z'),
    deploymentId: DEPLOYMENT_ID,
  };
}

function observedContainer(
  containerId: string,
  port: number,
  status: ContainerRuntimeService['status'] = 'running',
): ContainerRuntimeService {
  return { containerId, composeServiceName: containerId, port, status, health: 'healthy' };
}

function setup(observed: ContainerRuntimeService[], protocolsByPort: Record<number, string>) {
  const services = [storedService('db', 'postgres', 5432), storedService('api', 'api', 8080)];
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
  const updates: Array<{ where: { id: string }; data: Record<string, unknown> }> = [];

  const prisma = {
    deployment: {
      findUnique: vi.fn(async () => deployment),
      findUniqueOrThrow: vi.fn(async () => ({
        ...deployment,
        services: services.map((service) => ({
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
  } as unknown as PrismaService;

  const runtime = { list: vi.fn(async () => observed) } as unknown as ContainerRuntimePort;
  const probe: ContainerProbePort = {
    probe: vi.fn(async ([port]: readonly number[]) => {
      const protocol = protocolsByPort[port];
      return protocol
        ? { outcome: { kind: 'identified' as const, protocols: [protocol as never] }, ports: [] }
        : { outcome: { kind: 'unidentified' as const }, ports: [] };
    }),
  };

  return {
    useCase: new ClassifyDeploymentServicesUseCase(prisma, runtime, probe),
    prisma,
    probe,
  };
}

describe('resolveServiceType', () => {
  it.each([
    ['postgres', 'DATABASE'],
    ['mysql', 'DATABASE'],
    ['mongo', 'DATABASE'],
    ['resp', 'CACHE'],
    ['memcached', 'CACHE'],
    ['amqp', 'MESSAGE_BROKER'],
    ['kafka', 'MESSAGE_BROKER'],
    ['nats', 'MESSAGE_BROKER'],
    ['mqtt', 'MESSAGE_BROKER'],
    ['http', 'BACKEND'],
  ] as const)('maps %s to %s', (protocol, serviceType) => {
    expect(resolveServiceType({ kind: 'identified', protocols: [protocol] })).toBe(serviceType);
  });

  it('returns UNKNOWN when nothing was identified', () => {
    expect(resolveServiceType({ kind: 'unidentified' })).toBe('UNKNOWN');
    expect(resolveServiceType({ kind: 'no_listeners' })).toBe('UNKNOWN');
  });
});

describe('ClassifyDeploymentServicesUseCase', () => {
  it('probes the port of every running container and stores its service type', async () => {
    const { useCase, probe } = setup(
      [observedContainer('db', 5432), observedContainer('api', 8080)],
      { 5432: 'postgres', 8080: 'http' },
    );

    const deployment = await useCase.execute(DEPLOYMENT_ID);

    expect(probe.probe).toHaveBeenCalledWith([5432]);
    expect(probe.probe).toHaveBeenCalledWith([8080]);
    expect(
      deployment.services.map((service) => [service.id, service.serviceType]),
    ).toEqual([
      ['db', 'DATABASE'],
      ['api', 'BACKEND'],
    ]);
  });

  it('rejects the classification when a container is not running', async () => {
    const { useCase, probe } = setup(
      [observedContainer('db', 5432), observedContainer('api', 8080, 'exited')],
      {},
    );

    await expect(useCase.execute(DEPLOYMENT_ID)).rejects.toBeInstanceOf(ConflictException);
    expect(probe.probe).not.toHaveBeenCalled();
  });

  it('rejects the classification when a container no longer exists', async () => {
    const { useCase } = setup([observedContainer('db', 5432)], {});

    await expect(useCase.execute(DEPLOYMENT_ID)).rejects.toBeInstanceOf(ConflictException);
  });

  it('fails when the deployment does not exist', async () => {
    const { useCase, prisma } = setup([], {});
    vi.mocked(prisma.deployment.findUnique).mockResolvedValueOnce(null as never);

    await expect(useCase.execute(DEPLOYMENT_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});
