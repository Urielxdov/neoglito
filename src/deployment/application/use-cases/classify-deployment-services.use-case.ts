import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { dirname } from 'node:path';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CONTAINER_RUNTIME_PORT } from '../../../container/application/container-runtime.port.js';
import type {
  ContainerRuntimePort,
  ContainerRuntimeService,
} from '../../../container/application/container-runtime.port.js';
import { CONTAINER_CLASSIFICATION_PORT } from '../../../ports/application/container-classification.port.js';
import type { ContainerClassificationPort } from '../../../ports/application/container-classification.port.js';
import { ServiceType } from '../../domain/value-objects/service-type.js';
import { toDeployment } from './deploy-compose.use-case.js';
import { deploymentRuntimeProjectName } from '../ports/deployment-compose.port.js';

/**
 * Clasifica los servicios por imagen, protocolo y evidencia adicional.
 *
 * Precondiciones: cada contenedor del despliegue debe seguir existiendo,
 * estar en `running`. Un contenedor puede no publicar puertos.
 */
@Injectable()
export class ClassifyDeploymentServicesUseCase {
  private readonly logger = new Logger(ClassifyDeploymentServicesUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONTAINER_RUNTIME_PORT)
    private readonly runtime: ContainerRuntimePort,
    @Inject(CONTAINER_CLASSIFICATION_PORT)
    private readonly classifier: ContainerClassificationPort,
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

    const observed = await this.observeContainers(
      deployment.id,
      deployment.composePath,
    );
    const observedById = new Map(
      observed.map((container) => [container.containerId, container]),
    );

    const rejected = deployment.services.flatMap((service) => {
      const container = observedById.get(service.id);
      if (!container) return [`${service.composeServiceName} (no existe)`];
      if (container.status !== 'running') {
        return [`${service.composeServiceName} (${container.status})`];
      }
      return [];
    });
    if (rejected.length > 0) {
      throw new ConflictException(
        `Todos los contenedores deben estar en running: ${rejected.join(', ')}`,
      );
    }

    // Inspeccionamos todos los contenedores del Compose para evaluar su uso mutuo.
    const inspections = await this.runtime
      .inspect(observed.map((container) => container.containerId))
      .catch((error: unknown) => {
        throw new ConflictException(
          error instanceof Error ? error.message : String(error),
        );
      });
    const inspectedIds = new Set(
      inspections.map((container) => container.containerId),
    );
    if (deployment.services.some((service) => !inspectedIds.has(service.id))) {
      throw new ConflictException(
        'No se pudieron inspeccionar todos los contenedores del despliegue',
      );
    }
    const classifications = await this.classifier.classify(inspections);
    const classifiedById = new Map(
      classifications.map((result) => [
        result.containerId,
        result.classification,
      ]),
    );
    const classified = deployment.services.map((service) => {
      const container = observedById.get(service.id)!;
      const result = classifiedById.get(service.id);
      if (!result)
        throw new ConflictException(
          `No se recibió clasificación para ${service.composeServiceName}`,
        );

      if (result.kind !== 'resolved') {
        this.logger.debug(
          `Clasificación de ${service.composeServiceName}: ${result.kind}; ${result.evidence.join('; ')}`,
        );
      }
      return {
        container,
        serviceType:
          result.kind === 'resolved' ? result.type : ServiceType.UNKNOWN,
      };
    });

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
    deploymentId: string,
    composePath: string,
  ): Promise<ContainerRuntimeService[]> {
    try {
      return await this.runtime.list(
        dirname(composePath),
        composePath,
        deploymentRuntimeProjectName(deploymentId, composePath),
      );
    } catch (error) {
      throw new ConflictException(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
