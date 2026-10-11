import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import type {
  ContainerRuntimePort,
  ContainerRuntimeService,
} from '../../../container/application/container-runtime.port.js';
import type { ProjectAnalysisService } from '../../../analisys/application/project-analysis.service.js';
import type {
  HeldPortReservation,
  PortReservationPort,
} from '../../../ports/application/port-reservation.port.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import {
  DeployComposeUseCase,
  StopDeploymentUseCase,
} from './deploy-compose.use-case.js';
import { YamlDeploymentComposeService } from '../../infrastructure/compose/yaml-deployment-compose.service.js';
import { OtelComposeInjector } from '../../../telemetry/infrastructure/injection/otel-compose-injector.service.js';
import type { DeploymentTelemetryTokenPort } from '../../../telemetry/application/ports/deployment-telemetry-token.port.js';

vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs/promises')>()),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

function setup(port = 5432) {
  const sourcePath = resolve('/repo/compose.yml');
  vi.mocked(readFile).mockResolvedValue(
    'services:\n  db:\n    image: postgres:16\n    environment: {MODE: original}\n    ports: ["5432:5432"]\n  worker:\n    image: custom/worker\n',
  );
  const record = {
    id: 'deployment',
    projectId: 1,
    composePath: sourcePath,
    status: 'pending',
    createdAt: new Date(),
    startedAt: null,
    finishedAt: null,
    services: [],
  };
  const prisma = {
    deployment: {
      create: vi.fn(async () => record),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(record, data);
        return record;
      }),
      findUnique: vi.fn(async () => record),
    },
    deploymentService: {
      createMany: vi.fn(async () => ({ count: 2 })),
      findMany: vi.fn(async () => [{ id: 'db' }, { id: 'worker' }]),
      updateMany: vi.fn(),
    },
  };
  const analysis = {
    getComposeFiles: vi.fn(async () => ({ dockerFilesPath: [sourcePath] })),
  };
  const runtime = {
    resolveHostPath: vi.fn(async (path: string) => path),
    up: vi.fn(async () => {}),
    down: vi.fn(async () => {}),
    list: vi.fn(async (): Promise<ContainerRuntimeService[]> => [
      {
        containerId: 'db',
        composeServiceName: 'db',
        port,
        status: 'running',
        health: 'healthy',
      },
      {
        containerId: 'worker',
        composeServiceName: 'worker',
        port: 0,
        status: 'running',
        health: 'none',
      },
    ]),
  };
  const reservations = {
    holdPort: vi.fn(
      async (
        port: number,
        ownerId: string,
      ): Promise<HeldPortReservation | null> => ({
        port,
        ownerId,
        handoff: vi.fn(),
        release: vi.fn(),
      }),
    ),
    releasePort: vi.fn(async () => true),
    restorePort: vi.fn(async () => true),
  };
  return {
    sourcePath,
    record,
    prisma,
    runtime,
    reservations,
    useCase: new DeployComposeUseCase(
      prisma as unknown as PrismaService,
      analysis as unknown as ProjectAnalysisService,
      runtime as unknown as ContainerRuntimePort,
      reservations as unknown as PortReservationPort,
      new YamlDeploymentComposeService(
        runtime as unknown as ContainerRuntimePort,
      ),
    ),
  };
}

it('deploys a worker without reserving port zero alongside a published service', async () => {
  const { useCase, sourcePath, reservations, prisma } = setup();
  await useCase.execute(1, 1, sourcePath);
  expect(reservations.restorePort).toHaveBeenCalledExactlyOnceWith(5432, 'db');
  expect(prisma.deploymentService.createMany).toHaveBeenCalledWith({
    data: expect.arrayContaining([
      expect.objectContaining({
        id: 'worker',
        port: 0,
        deploymentId: 'deployment',
      }),
    ]),
  });
});

it('reserves and runs the actual YAML with the submitted ports and scoped environment', async () => {
  const { useCase, sourcePath, reservations, runtime, record } = setup(15432);
  const result = await useCase.execute(1, 1, sourcePath, {
    environment: [{ service: 'db', key: 'MODE', value: 'selected' }],
    ports: [
      {
        service: 'db',
        targetPort: '5432',
        publishedPort: '15432',
        hostIp: null,
        protocol: 'tcp',
        mappingType: 'one-to-one',
      },
    ],
  });
  const preparedPath = resolve(
    '.neoglito/deployments/.neoglito-deployment.compose.yml',
  );
  expect(runtime.up).toHaveBeenCalledExactlyOnceWith(
    resolve('.neoglito/deployments'),
    preparedPath,
    'neoglito-deployment',
  );
  expect(runtime.list).toHaveBeenCalledExactlyOnceWith(
    resolve('.neoglito/deployments'),
    preparedPath,
    'neoglito-deployment',
  );
  expect(reservations.holdPort).toHaveBeenCalledExactlyOnceWith(
    15432,
    'deployment:deployment:port:15432',
  );
  expect(reservations.restorePort).toHaveBeenCalledExactlyOnceWith(15432, 'db');
  expect(record.composePath).toBe(preparedPath);
  expect(result.composePath).toBe(preparedPath);
  const output = parse(vi.mocked(writeFile).mock.calls[0][1] as string) as {
    services: { db: { ports: string[]; environment: Record<string, string> } };
  };
  expect(output.services.db.ports).toEqual(['15432:5432/tcp']);
  expect(output.services.db.environment.MODE).toBe('selected');
});

it('rejects invalid settings before reserving ports or starting Docker', async () => {
  const { useCase, sourcePath, runtime, reservations, record } = setup();
  await expect(
    useCase.execute(1, 1, sourcePath, {
      environment: [{ service: 'missing', key: 'MODE', value: 'selected' }],
    }),
  ).rejects.toThrow('servicio inexistente');
  expect(runtime.up).not.toHaveBeenCalled();
  expect(reservations.holdPort).not.toHaveBeenCalled();
  expect(record.status).toBe('failed');
});

it('does not start Docker when the selected published port cannot be reserved', async () => {
  const { useCase, sourcePath, runtime, reservations } = setup();
  reservations.holdPort.mockResolvedValueOnce(null);
  await expect(useCase.execute(1, 1, sourcePath)).rejects.toThrow('5432');
  expect(runtime.up).not.toHaveBeenCalled();
  expect(runtime.down).not.toHaveBeenCalled();
});

it('cleans up only the independent Compose project when up fails partway through', async () => {
  const { useCase, sourcePath, runtime, reservations, record } = setup();
  runtime.up.mockRejectedValueOnce(new Error('Port binding failed'));
  await expect(useCase.execute(1, 1, sourcePath)).rejects.toThrow(
    'Port binding failed',
  );
  expect(runtime.down).toHaveBeenCalledExactlyOnceWith(
    resolve('.neoglito/deployments'),
    resolve('.neoglito/deployments/.neoglito-deployment.compose.yml'),
    'neoglito-deployment',
  );
  expect(reservations.releasePort).toHaveBeenCalledWith(
    'deployment:deployment:port:5432',
  );
  expect(record.status).toBe('failed');
});

it('stops the stored configured file and uses its deployment project name', async () => {
  const { useCase, sourcePath, prisma, runtime, reservations } = setup();
  await useCase.execute(1, 1, sourcePath);
  await new StopDeploymentUseCase(
    prisma as unknown as PrismaService,
    runtime as unknown as ContainerRuntimePort,
    reservations as unknown as PortReservationPort,
  ).execute('deployment');
  expect(runtime.down).toHaveBeenCalledExactlyOnceWith(
    resolve('.neoglito/deployments'),
    resolve('.neoglito/deployments/.neoglito-deployment.compose.yml'),
    'neoglito-deployment',
  );
});

it('keeps the previous project selection for deployments recorded with the source Compose', async () => {
  const { sourcePath, prisma, runtime, reservations } = setup();
  await new StopDeploymentUseCase(
    prisma as unknown as PrismaService,
    runtime as unknown as ContainerRuntimePort,
    reservations as unknown as PortReservationPort,
  ).execute('deployment');
  expect(runtime.down).toHaveBeenCalledExactlyOnceWith(
    resolve('/repo'),
    sourcePath,
    undefined,
  );
});

describe('telemetry', () => {
  const tokens = () => ({
    issue: vi.fn(async () => 'ngt_secret'),
    resolve: vi.fn(),
    revoke: vi.fn(async () => undefined),
  });
  const withTelemetry = (token: ReturnType<typeof tokens>) => {
    const base = setup();
    const useCase = new DeployComposeUseCase(
      base.prisma as unknown as PrismaService,
      { getComposeFiles: vi.fn(async () => ({ dockerFilesPath: [base.sourcePath] })) } as unknown as ProjectAnalysisService,
      base.runtime as unknown as ContainerRuntimePort,
      base.reservations as unknown as PortReservationPort,
      new YamlDeploymentComposeService(
        base.runtime as unknown as ContainerRuntimePort,
        new OtelComposeInjector(),
      ),
      token as unknown as DeploymentTelemetryTokenPort,
    );
    return { ...base, useCase };
  };
  const writtenCompose = () => {
    const call = vi.mocked(writeFile).mock.calls.at(-1);
    return parse(call?.[1] as string) as {
      services: Record<string, { environment?: Record<string, string> }>;
    };
  };

  it('issues a per-deployment token and injects it only into application services', async () => {
    const token = tokens();
    const { useCase, sourcePath } = withTelemetry(token);
    await useCase.execute(1, 1, sourcePath);
    expect(token.issue).toHaveBeenCalledExactlyOnceWith('deployment');
    const { services } = writtenCompose();
    expect(services.worker.environment).toMatchObject({
      OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Bearer%20ngt_secret',
      OTEL_SERVICE_NAME: 'worker',
      OTEL_RESOURCE_ATTRIBUTES:
        'neoglito.deployment.id=deployment,neoglito.project.id=1',
    });
    // postgres es infraestructura: conserva solo su configuración original.
    expect(services.db.environment).toEqual({ MODE: 'original' });
  });

  it('lets user-defined variables win over the injected ones', async () => {
    const { useCase, sourcePath } = withTelemetry(tokens());
    await useCase.execute(1, 1, sourcePath, {
      environment: [{ service: 'worker', key: 'OTEL_SERVICE_NAME', value: 'mine' }],
    });
    expect(writtenCompose().services.worker.environment?.OTEL_SERVICE_NAME).toBe(
      'mine',
    );
  });

  it('does not issue tokens when telemetry is disabled', async () => {
    vi.stubEnv('TELEMETRY_ENABLED', 'false');
    try {
      const token = tokens();
      const { useCase, sourcePath } = withTelemetry(token);
      await useCase.execute(1, 1, sourcePath);
      expect(token.issue).not.toHaveBeenCalled();
      expect(writtenCompose().services.worker.environment).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('revokes the token when the deployment fails to start', async () => {
    const token = tokens();
    const { useCase, sourcePath, runtime } = withTelemetry(token);
    runtime.up.mockRejectedValueOnce(new Error('build failed'));
    await expect(useCase.execute(1, 1, sourcePath)).rejects.toThrow(
      'build failed',
    );
    expect(token.revoke).toHaveBeenCalledExactlyOnceWith('deployment');
  });

  it('revokes the token when the deployment is stopped', async () => {
    const token = tokens();
    const { prisma, runtime, reservations } = withTelemetry(token);
    await new StopDeploymentUseCase(
      prisma as unknown as PrismaService,
      runtime as unknown as ContainerRuntimePort,
      reservations as unknown as PortReservationPort,
      token as unknown as DeploymentTelemetryTokenPort,
    ).execute('deployment');
    expect(token.revoke).toHaveBeenCalledExactlyOnceWith('deployment');
  });
});
