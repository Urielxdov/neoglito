import type { Container } from '../../../container/domain/entities/container.entity.js';

export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'starting'
  | 'running'
  | 'failed'
  | 'stopping'
  | 'stopped';

export class Deployment {
  constructor(
    public readonly id: string,
    public readonly projectId: number,
    public readonly composePath: string,
    public readonly status: DeploymentStatus,
    public readonly createdAt: Date,
    public readonly startedAt: Date | null,
    public readonly finishedAt: Date | null,
    public readonly services: Container[],
  ) {}
}
