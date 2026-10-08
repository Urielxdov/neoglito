import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { dirname } from 'node:path';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CONTAINER_RUNTIME_PORT } from '../../../container/application/container-runtime.port.js';
import type {
  ContainerRuntimePort,
  ContainerRuntimeService,
} from '../../../container/application/container-runtime.port.js';
import { CONTAINER_PROBE_PORT } from '../../../ports/application/container-probe.port.js';
import type { ContainerProbePort } from '../../../ports/application/container-probe.port.js';
import { resolveServiceType } from '../../domain/services/protocol-service-type.js';
import { toDeployment } from './deploy-compose.use-case.js';

/**
 * Identifica la categoría (ServiceType) de cada contenedor de un despliegue
 * sondeando por red el puerto que publica (ver port-identification.ts).
 *
 * Precondiciones: cada contenedor del despliegue debe seguir existiendo,
 * estar en `running` y tener un puerto publicado en el host.
 */
@Injectable()
export class ClassifyDeploymentServicesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONTAINER_RUNTIME_PORT)
    private readonly runtime: ContainerRuntimePort,
    @Inject(CONTAINER_PROBE_PORT)
    private readonly containerProbe: ContainerProbePort,
  ) {}

  async execute(deploymentId: string) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { services: true },
    });
    if (!deployment) {
      throw new NotFoundException(`Deployment ${deploymentId} does not exist`);
    }
    if (deployment.services.length === 0) {
      throw new ConflictException(
        `El despliegue ${deploymentId} no tiene contenedores asociados`,
      );
    }

    const observed = await this.observeContainers(deployment.composePath);
    const observedById = new Map(
      observed.map((container) => [container.containerId, container]),
    );

    const rejected = deployment.services.flatMap((service) => {
      const container = observedById.get(service.id);
      if (!container) return [`${service.composeServiceName} (no existe)`];
      if (container.status !== 'running') {
        return [`${service.composeServiceName} (${container.status})`];
      }
      if (!(container.port > 0)) {
        return [`${service.composeServiceName} (sin puerto asignado)`];
      }
      return [];
    });
    if (rejected.length > 0) {
      throw new ConflictException(
        `Todos los contenedores deben estar en running y tener un puerto asignado: ${rejected.join(', ')}`,
      );
    }

    const classified = await Promise.all(
      deployment.services.map(async (service) => {
        // Validado arriba: el contenedor existe, está en running y publica un puerto.
        const container = observedById.get(service.id)!;
        const { outcome } = await this.containerProbe.probe([container.port]);
        return { container, serviceType: resolveServiceType(outcome) };
      }),
    );

    const observedAt = new Date();
    await this.prisma.$transaction(
      classified.map(({ container, serviceType }) =>
        this.prisma.deploymentService.update({
          where: { id: container.containerId },
          data: {
            serviceType,
            port: container.port,
            status: container.status,
            health: container.health,
            lastObservedAt: observedAt,
          },
        }),
      ),
    );

    const updated = await this.prisma.deployment.findUniqueOrThrow({
      where: { id: deploymentId },
      include: { services: true },
    });
    return toDeployment(updated);
  }

  private async observeContainers(
    composePath: string,
  ): Promise<ContainerRuntimeService[]> {
    try {
      return await this.runtime.list(dirname(composePath), composePath);
    } catch (error) {
      // El runtime falla cuando un contenedor no publica puerto (p. ej. detenido).
      throw new ConflictException(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
