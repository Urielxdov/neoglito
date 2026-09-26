export const CONTAINER_RUNTIME_PORT = Symbol('CONTAINER_RUNTIME_PORT');

export interface ContainerRuntimePort {
  up(path: string, dockerCompose: string): Promise<void>;
  down(path: string, dockerCompose: string): Promise<void>;
  delete(path: string, dockerCompose: string): Promise<void>;
}
