import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { dirname, resolve, sep } from 'node:path';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CONTAINER_RUNTIME_PORT } from '../../../shared/application/container-runtime.port.js';
import type { ContainerRuntimePort } from '../../../shared/application/container-runtime.port.js';
import { CloneRepositoriesUseCase } from './clone-repositories.use-case.js';
import { InitDeployProjectUseCase } from './init-deploy-project.use-case.js';

@Injectable()
export class DeployComposeUseCase {
  private readonly logger = new Logger(DeployComposeUseCase.name)
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloneRepositories: CloneRepositoriesUseCase,
    private readonly findComposeFiles: InitDeployProjectUseCase,
    @Inject(CONTAINER_RUNTIME_PORT) private readonly runtime: ContainerRuntimePort,
  ) { }

  async execute(userId: number, projectId: number, composePath: string) {
    const roots = await this.cloneRepositories.execute(userId, projectId);
    const candidates = (await Promise.all(roots.map((root) => this.findComposeFiles.execute(root)))).flat();
    const composeFile = candidates.find((candidate) => this.samePath(candidate, composePath));
    if (!composeFile) throw new BadRequestException('El archivo Compose no pertenece al proyecto seleccionado');

    const deployment = await this.prisma.deployment.create({
      data: { projectId, composePath: composeFile, status: 'pending' },
    });
    try {
      await this.prisma.deployment.update({ where: { id: deployment.id }, data: { status: 'building' } });
      await this.runtime.up(dirname(composeFile), composeFile);
      this.logger.debug('Hasta aqui bien')
      await this.prisma.deployment.update({ where: { id: deployment.id }, data: { status: 'starting', startedAt: new Date() } });
      const observed = await this.runtime.list(dirname(composeFile), composeFile);
      if (observed.length === 0) throw new Error('Docker Compose no reportó contenedores para el archivo seleccionado');
      await this.prisma.deploymentService.createMany({
        data: observed.map((service) => ({
          id: service.containerId,
          composeServiceName: service.composeServiceName,
          status: service.status,
          health: service.health,
          lastObservedAt: new Date(),
          deploymentId: deployment.id,
        }))
      });
      return this.prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: 'running' },
        include: { services: true },
      });
    } catch (error) {
      await this.prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: 'failed', finishedAt: new Date() },
      });
      this.logger.error(`Error durante el arranque del docker ${error}`)

      throw error;
    }
  }

  private samePath(left: string, right: string): boolean {
    const normalize = (value: string) => resolve(value).split(sep).join('/').toLowerCase();
    return normalize(left) === normalize(right);
  }
}

@Injectable()
export class GetProjectDeploymentsUseCase {
  constructor(private readonly prisma: PrismaService) { }

  async execute(projectId: number) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundException(`Project ${projectId} does not exist`);
    return this.prisma.deployment.findMany({ where: { projectId }, include: { services: true }, orderBy: { createdAt: 'desc' } });
  }
}

@Injectable()
export class StopDeploymentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONTAINER_RUNTIME_PORT) private readonly runtime: ContainerRuntimePort,
  ) { }

  async execute(deploymentId: string) {
    const deployment = await this.prisma.deployment.findUnique({ where: { id: deploymentId } });
    if (!deployment) throw new NotFoundException(`Deployment ${deploymentId} does not exist`);
    await this.prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'stopping' } });
    try {
      await this.runtime.down(dirname(deployment.composePath), deployment.composePath);
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
      await this.prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'failed' } });
      throw error;
    }
  }
}
