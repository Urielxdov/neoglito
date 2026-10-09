import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { DeploymentPortsResponse } from '@neoglito/shared/repository';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DEPLOYMENT_COMPOSE_PORT } from '../ports/deployment-compose.port.js';
import type { DeploymentComposePort } from '../ports/deployment-compose.port.js';

@Injectable()
export class GetDeploymentPortsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DEPLOYMENT_COMPOSE_PORT)
    private readonly compose: DeploymentComposePort,
  ) {}

  async execute(deploymentId: string): Promise<DeploymentPortsResponse> {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { services: true },
    });
    if (!deployment) throw new NotFoundException('El despliegue no existe');

    const active = ['building', 'starting', 'running'].includes(
      deployment.status,
    );
    const source = active
      ? await this.compose.readSource(deployment.composePath, deployment.id)
      : { sourceComposePath: null, projectDirectory: null };

    return {
      deploymentId: deployment.id,
      projectId: deployment.projectId,
      status: deployment.status,
      ...source,
      services: deployment.services.map((service) => ({
        containerId: service.id,
        composeServiceName: service.composeServiceName,
        port: active && service.port > 0 ? service.port : null,
      })),
    };
  }
}
