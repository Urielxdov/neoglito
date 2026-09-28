import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { parse } from 'yaml';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CONTAINER_RUNTIME_PORT } from '../../../shared/application/container-runtime.port.js';
import type { ContainerRuntimePort } from '../../../shared/application/container-runtime.port.js';
import { PORT_RESERVATION_PORT } from '../../../shared/application/port-reservation.port.js';
import type {
  HeldPortReservation,
  PortReservationPort,
} from '../../../shared/application/port-reservation.port.js';
import { CloneRepositoriesUseCase } from './clone-repositories.use-case.js';
import { InitDeployProjectUseCase } from './init-deploy-project.use-case.js';

@Injectable()
export class DeployComposeUseCase {
  private readonly logger = new Logger(DeployComposeUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloneRepositories: CloneRepositoriesUseCase,
    private readonly findComposeFiles: InitDeployProjectUseCase,
    @Inject(CONTAINER_RUNTIME_PORT)
    private readonly runtime: ContainerRuntimePort,
    @Inject(PORT_RESERVATION_PORT)
    private readonly portReservation: PortReservationPort,
  ) {}

  async execute(userId: number, projectId: number, composePath: string) {
    const roots = await this.cloneRepositories.execute(userId, projectId);
    const candidates = (
      await Promise.all(roots.map((root) => this.findComposeFiles.execute(root)))
    ).flat();
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
    const portHolds: HeldPortReservation[] = [];
    const restoredOwnerIds: string[] = [];

    try {
      const publishedPorts = await this.extractPublishedPorts(composeFile);
      for (const port of publishedPorts) {
        const ownerId = this.deploymentPortOwnerId(deployment.id, port);
        const heldPort = await this.portReservation.holdPort(port, ownerId);
        if (!heldPort) {
          throw new Error(`No se pudo reservar temporalmente el puerto ${port}`);
        }

        portHolds.push(heldPort);
      }

      await this.prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: 'building' },
      });
      await Promise.all(portHolds.map((heldPort) => heldPort.handoff()));
      await this.runtime.up(dirname(composeFile), composeFile);
      this.logger.debug('Hasta aqui bien');

      await this.prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: 'starting', startedAt: new Date() },
      });
      const observed = await this.runtime.list(dirname(composeFile), composeFile);
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
        observed.map(async (service) => {
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

      return this.prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: 'running' },
        include: { services: true },
      });
    } catch (error) {
      await Promise.all(
        portHolds.map((heldPort) =>
          this.portReservation.releasePort(heldPort.ownerId),
        ),
      );
      await Promise.all(
        restoredOwnerIds.map((ownerId) => this.portReservation.releasePort(ownerId)),
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

  private deploymentPortOwnerId(deploymentId: string, port: number): string {
    return `deployment:${deploymentId}:port:${port}`;
  }

  private async extractPublishedPorts(composeFile: string): Promise<number[]> {
    const fileContent = await readFile(composeFile, 'utf8');
    const parsed = parse(fileContent) as unknown;
    if (!this.isRecord(parsed) || !this.isRecord(parsed.services)) {
      return [];
    }

    const ports = Object.values(parsed.services).flatMap((service) => {
      if (!this.isRecord(service)) {
        return [];
      }

      return this.extractServicePorts(service.ports);
    });

    return [...new Set(ports)];
  }

  private extractServicePorts(ports: unknown): number[] {
    if (!Array.isArray(ports)) {
      return [];
    }

    return ports.flatMap((port) => {
      if (typeof port === 'number') {
        return [];
      }

      if (typeof port === 'string') {
        return this.extractStringPort(port);
      }

      if (this.isRecord(port)) {
        const published = port.published;
        if (typeof published === 'number' && this.isValidPort(published)) {
          return [published];
        }

        if (typeof published === 'string') {
          const parsedPort = Number(published);
          return this.isValidPort(parsedPort) ? [parsedPort] : [];
        }
      }

      return [];
    });
  }

  private extractStringPort(port: string): number[] {
    const normalized = port.trim();
    if (!normalized.includes(':')) {
      return [];
    }

    const withoutProtocol = normalized.split('/')[0];
    const segments = withoutProtocol.split(':');
    const publishedPort = Number(segments.at(-2));

    return this.isValidPort(publishedPort) ? [publishedPort] : [];
  }

  private isValidPort(port: number): boolean {
    return Number.isInteger(port) && port > 0 && port <= 65535;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
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

    return this.prisma.deployment.findMany({
      where: { projectId },
      include: { services: true },
      orderBy: { createdAt: 'desc' },
    });
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
      await this.runtime.down(dirname(deployment.composePath), deployment.composePath);
      const services = await this.prisma.deploymentService.findMany({
        where: { deploymentId },
        select: { id: true },
      });
      await Promise.all(
        services.map((service) => this.portReservation.releasePort(service.id)),
      );
      await this.prisma.deploymentService.updateMany({
        where: { deploymentId },
        data: { status: 'exited', health: 'none', lastObservedAt: new Date() },
      });

      return await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'stopped', finishedAt: new Date() },
        include: { services: true },
      });
    } catch (error) {
      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: 'failed' },
      });
      throw error;
    }
  }
}
