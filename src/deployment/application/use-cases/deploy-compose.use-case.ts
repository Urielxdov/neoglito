import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { dirname, resolve, sep } from 'node:path';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { Container } from '../../../container/domain/entities/container.entity.js';
import type {
  ContainerHealth,
  ContainerStatus,
} from '../../../container/domain/entities/container.entity.js';
import { Deployment } from '../../domain/entities/deployment.entity.js';
import type { DeploymentStatus } from '../../domain/entities/deployment.entity.js';
import type { ServiceType } from '../../domain/value-objects/service-type.js';
import { CONTAINER_RUNTIME_PORT } from '../../../container/application/container-runtime.port.js';
import type { ContainerRuntimePort } from '../../../container/application/container-runtime.port.js';
import { draftPortOwnerId } from '../../../ports/application/draft-port-owner.js';
import { PORT_RESERVATION_PORT } from '../../../ports/application/port-reservation.port.js';
import type {
  HeldPortReservation,
  PortReservationPort,
} from '../../../ports/application/port-reservation.port.js';
import { ProjectAnalysisService } from '../../../analisys/application/project-analysis.service.js';
import {
  DEPLOYMENT_COMPOSE_PORT,
  deploymentRuntimeProjectName,
} from '../ports/deployment-compose.port.js';
import type {
  DeploymentComposePort,
  DeploymentComposeConfiguration,
  DeploymentTelemetryConfiguration,
  PreparedDeploymentCompose,
} from '../ports/deployment-compose.port.js';
import { DEPLOYMENT_TELEMETRY_TOKEN_PORT } from '../../../telemetry/application/ports/deployment-telemetry-token.port.js';
import type { DeploymentTelemetryTokenPort } from '../../../telemetry/application/ports/deployment-telemetry-token.port.js';
import { isTelemetryEnabled } from '../../../telemetry/application/telemetry-config.js';

interface DeploymentRecord {
  id: string;
  projectId: number;
  composePath: string;
  status: DeploymentStatus;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  services: Array<{
    id: string;
    composeServiceName: string;
    port: number;
    status: ContainerStatus;
    health: ContainerHealth;
    serviceType: ServiceType;
    lastObservedAt: Date;
    deploymentId: string;
  }>;
}

export function toDeployment(record: DeploymentRecord): Deployment {
  return new Deployment(
    record.id,
    record.projectId,
    record.composePath,
    record.status,
    record.createdAt,
    record.startedAt,
    record.finishedAt,
    record.services.map(
      (service) =>
        new Container(
          service.id,
          service.composeServiceName,
          service.port,
          service.status,
          service.health,
          service.serviceType,
          service.lastObservedAt,
          service.deploymentId,
        ),
    ),
  );
}

@Injectable()
export class DeployComposeUseCase {
  private readonly logger = new Logger(DeployComposeUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAnalysis: ProjectAnalysisService,
    @Inject(CONTAINER_RUNTIME_PORT)
    private readonly runtime: ContainerRuntimePort,
    @Inject(PORT_RESERVATION_PORT)
    private readonly portReservation: PortReservationPort,
    @Inject(DEPLOYMENT_COMPOSE_PORT)
    private readonly compose: DeploymentComposePort,
    @Optional()
    @Inject(DEPLOYMENT_TELEMETRY_TOKEN_PORT)
    private readonly telemetryTokens?: DeploymentTelemetryTokenPort,
  ) {}

  async execute(
    userId: number,
    projectId: number,
    composePath: string,
    configuration: DeploymentComposeConfiguration = {},
  ) {
    const { dockerFilesPath: candidates } =
      await this.projectAnalysis.getComposeFiles(userId, projectId);
    const composeFile = candidates.find((candidate) =>
      this.samePath(candidate, composePath),
    );
    if (!composeFile) {
      throw new BadRequestException(
        'El archivo Compose no pertenece al proyecto seleccionado',
      );
    }

    const deployment = await this.prisma.deployment.create({
      data: { projectId, composePath: composeFile, status: 'pending' },
    });
    this.logger.log(
      `[deployment:compose] Archivo seleccionado ${JSON.stringify({ deploymentId: deployment.id, projectId, requestedComposePath: composePath, selectedComposePath: composeFile })}`,
    );
    const portHolds: HeldPortReservation[] = [];
    const restoredOwnerIds: string[] = [];
    let prepared: PreparedDeploymentCompose | undefined;
    let runtimeStarted = false;

    try {
      prepared = await this.compose.prepare(
        composeFile,
        deployment.id,
        configuration,
        await this.issueTelemetry(deployment.id, projectId),
      );
      await this.prisma.deployment.update({
        where: { id: deployment.id },
        data: { composePath: prepared.composePath },
      });
      const { publishedPorts } = prepared;
      this.logger.log(
        `[deployment:compose] Puertos del archivo que se van a reservar ${JSON.stringify({ deploymentId: deployment.id, projectId, composePath: prepared.composePath, publishedPorts })}`,
      );
      for (const port of publishedPorts) {
        // El puerto pasa del formulario (reserva provisional) al despliegue.
        await this.portReservation.releasePort(
          draftPortOwnerId(projectId, port),
        );
        const ownerId = this.deploymentPortOwnerId(deployment.id, port);
        const heldPort = await this.portReservation.holdPort(port, ownerId);
        if (!heldPort) {
          throw new Error(
            `No se pudo reservar temporalmente el puerto ${port}`,
          );
        }

        portHolds.push(heldPort);
      }

      await this.prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: 'building' },
      });
      await Promise.all(portHolds.map((heldPort) => heldPort.handoff()));
      runtimeStarted = true;
      await this.runtime.up(
        dirname(prepared.composePath),
        prepared.composePath,
        prepared.projectName,
      );
      this.logger.log(
        `[deployment:compose] Docker Compose up completado ${JSON.stringify({ deploymentId: deployment.id, composePath: prepared.composePath, projectName: prepared.projectName })}`,
      );

      await this.prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: 'starting', startedAt: new Date() },
      });
      const observed = await this.runtime.list(
        dirname(prepared.composePath),
        prepared.composePath,
        prepared.projectName,
      );
      this.logger.log(
        `[deployment:compose] Contenedores observados ${JSON.stringify({ deploymentId: deployment.id, services: observed.map((service) => ({ containerId: service.containerId, service: service.composeServiceName, port: service.port, status: service.status, health: service.health })) })}`,
      );
      if (observed.length === 0) {
        throw new Error(
          'Docker Compose no reporto contenedores para el archivo seleccionado',
        );
      }

      await Promise.all(
        portHolds.map((heldPort) =>
          this.portReservation.releasePort(heldPort.ownerId),
        ),
      );
      await Promise.all(
        observed
          .filter((service) => service.port > 0)
          .map(async (service) => {
            const restored = await this.portReservation.restorePort(
              service.port,
              service.containerId,
            );
            if (!restored) {
              throw new Error(
                `No se pudo transferir la reserva del puerto ${service.port} al contenedor ${service.containerId}`,
              );
            }

            restoredOwnerIds.push(service.containerId);
          }),
      );

      await this.prisma.deploymentService.createMany({
        data: observed.map((service) => ({
          id: service.containerId,
          composeServiceName: service.composeServiceName,
          port: service.port,
          status: service.status,
          health: service.health,
          lastObservedAt: new Date(),
          deploymentId: deployment.id,
        })),
      });

      const runningDeployment = await this.prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: 'running' },
        include: { services: true },
      });
      return toDeployment(runningDeployment);
    } catch (error) {
      await this.telemetryTokens
        ?.revoke(deployment.id)
        .catch(() => undefined);
      // Compose puede haber creado parte de los contenedores antes de fallar.
      if (runtimeStarted && prepared) {
        await this.runtime
          .down(
            dirname(prepared.composePath),
            prepared.composePath,
            prepared.projectName,
          )
          .catch((cleanupError: unknown) => {
            this.logger.error(
              `No se pudo detener el despliegue fallido ${deployment.id}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
            );
          });
      }
      await Promise.all(
        portHolds.map((heldPort) =>
          this.portReservation.releasePort(heldPort.ownerId),
        ),
      );
      await Promise.all(
        restoredOwnerIds.map((ownerId) =>
          this.portReservation.releasePort(ownerId),
        ),
      );
      await this.prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: 'failed', finishedAt: new Date() },
      });
      this.logger.error(
        `Error durante el arranque del docker ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      throw error;
    }
  }

  private async issueTelemetry(
    deploymentId: string,
    projectId: number,
  ): Promise<DeploymentTelemetryConfiguration | undefined> {
    if (!this.telemetryTokens || !isTelemetryEnabled()) return undefined;
    return {
      token: await this.telemetryTokens.issue(deploymentId),
      projectId,
    };
  }

  private deploymentPortOwnerId(deploymentId: string, port: number): string {
    return `deployment:${deploymentId}:port:${port}`;
  }

  private samePath(left: string, right: string): boolean {
    const normalize = (value: string) =>
      resolve(value).split(sep).join('/').toLowerCase();
    return normalize(left) === normalize(right);
  }
}

@Injectable()
export class GetProjectDeploymentsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} does not exist`);
    }

    const deployments = await this.prisma.deployment.findMany({
      where: { projectId },
      include: { services: true },
      orderBy: { createdAt: 'desc' },
    });
    return deployments.map(toDeployment);
  }
}

@Injectable()
export class StopDeploymentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONTAINER_RUNTIME_PORT)
    private readonly runtime: ContainerRuntimePort,
    @Inject(PORT_RESERVATION_PORT)
    private readonly portReservation: PortReservationPort,
    @Optional()
    @Inject(DEPLOYMENT_TELEMETRY_TOKEN_PORT)
    private readonly telemetryTokens?: DeploymentTelemetryTokenPort,
  ) {}

  async execute(deploymentId: string) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
    });
    if (!deployment) {
      throw new NotFoundException(`Deployment ${deploymentId} does not exist`);
    }

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'stopping' },
    });

    try {
      await this.runtime.down(
        dirname(deployment.composePath),
        deployment.composePath,
        deploymentRuntimeProjectName(deployment.id, deployment.composePath),
      );
      const services = await this.prisma.deploymentService.findMany({
        where: { deploymentId },
        select: { id: true },
      });
      await Promise.all(
        services.map((service) => this.portReservation.releasePort(service.id)),
      );
      // Un deployment detenido ya no debe poder enviar telemetría.
      await this.telemetryTokens?.revoke(deploymentId);
      await this.prisma.deploymentService.updateMany({
        where: { deploymentId },
        data: { status: 'exited', health: 'none', lastObservedAt: new Date() },
      });

      const stoppedDeployment = await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'stopped', finishedAt: new Date() },
        include: { services: true },
      });
      return toDeployment(stoppedDeployment);
    } catch (error) {
      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'failed' },
      });
      throw error;
    }
  }
}
