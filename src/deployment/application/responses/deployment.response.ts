import type { DeploymentResponse } from '@neoglito/shared/repository';
import type { Deployment } from '../../domain/entities/deployment.entity.js';

/** Convierte la entidad de dominio al contrato compartido con el frontend. */
export function toDeploymentResponse(deployment: Deployment): DeploymentResponse {
  return {
    id: deployment.id,
    projectId: deployment.projectId,
    composePath: deployment.composePath,
    status: deployment.status,
    createdAt: deployment.createdAt.toISOString(),
    startedAt: deployment.startedAt?.toISOString() ?? null,
    finishedAt: deployment.finishedAt?.toISOString() ?? null,
    services: deployment.services.map((service) => ({
      id: service.id,
      composeServiceName: service.composeServiceName,
      port: service.port,
      status: service.status,
      health: service.health,
      lastObservedAt: service.lastObservedAt.toISOString(),
      deploymentId: service.deploymentId,
    })),
  };
}
