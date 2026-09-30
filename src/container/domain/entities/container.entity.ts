export type ContainerStatus =
  | 'created'
  | 'running'
  | 'paused'
  | 'restarting'
  | 'exited'
  | 'dead';

export type ContainerHealth = 'starting' | 'healthy' | 'unhealthy' | 'none';

export class Container {
  constructor(
    public readonly id: string,
    public readonly composeServiceName: string,
    public readonly port: number,
    public readonly status: ContainerStatus,
    public readonly health: ContainerHealth,
    public readonly lastObservedAt: Date,
    public readonly deploymentId: string,
  ) {}
}
