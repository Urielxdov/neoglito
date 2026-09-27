export const CONTAINER_RUNTIME_PORT = Symbol('CONTAINER_RUNTIME_PORT');

export interface ContainerRuntimePort {
  up(path: string, dockerCompose: string): Promise<void>;
  list(path: string, dockerCompose: string): Promise<ContainerRuntimeService[]>;
  down(path: string, dockerCompose: string): Promise<void>;
  delete(path: string, dockerCompose: string): Promise<void>;
}

export interface ContainerRuntimeService {
  containerId: string;
  composeServiceName: string;
  status: 'created' | 'running' | 'paused' | 'restarting' | 'exited' | 'dead';
  health: 'starting' | 'healthy' | 'unhealthy' | 'none';
}
