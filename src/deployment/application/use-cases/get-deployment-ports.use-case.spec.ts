import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { DeploymentComposePort } from '../ports/deployment-compose.port.js';
import { GetDeploymentPortsUseCase } from './get-deployment-ports.use-case.js';

function setup(status = 'running') {
  const record = {
    id: 'deployment',
    projectId: 1,
    status,
    composePath: '/configured.yml',
    services: [
      { id: 'api', composeServiceName: 'api', port: 3002 },
      { id: 'worker', composeServiceName: 'worker', port: 0 },
    ],
  };
  const prisma = {
    deployment: { findUnique: vi.fn().mockResolvedValue(record) },
  };
  const compose = {
    readSource: vi.fn().mockResolvedValue({
      sourceComposePath: '/repo/compose.yml',
      projectDirectory: '/repo',
    }),
  };
  return {
    prisma,
    compose,
    useCase: new GetDeploymentPortsUseCase(
      prisma as unknown as PrismaService,
      compose as unknown as DeploymentComposePort,
    ),
  };
}

it('queries the requested deployment and returns assigned ports and null for unpublished services', async () => {
  const { useCase, prisma } = setup();
  expect(await useCase.execute('deployment')).toEqual({
    deploymentId: 'deployment',
    projectId: 1,
    status: 'running',
    sourceComposePath: '/repo/compose.yml',
    projectDirectory: '/repo',
    services: [
      { containerId: 'api', composeServiceName: 'api', port: 3002 },
      { containerId: 'worker', composeServiceName: 'worker', port: null },
    ],
  });
  expect(prisma.deployment.findUnique).toHaveBeenCalledWith({
    where: { id: 'deployment' },
    include: { services: true },
  });
});

it.each(['stopped', 'failed', 'stopping'])(
  'does not lock historical ports for a %s deployment',
  async (status) => {
    const { useCase, compose } = setup(status);
    const response = await useCase.execute('deployment');
    expect(response.services.every((service) => service.port === null)).toBe(
      true,
    );
    expect(compose.readSource).not.toHaveBeenCalled();
  },
);

it('returns not found for an unknown deployment', async () => {
  const { useCase, prisma, compose } = setup();
  prisma.deployment.findUnique.mockResolvedValue(null);
  await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
    NotFoundException,
  );
  expect(compose.readSource).not.toHaveBeenCalled();
});
