export const CONTAINER_RUNTIME_PORT = Symbol('CONTAINER_RUNTIME_PORT');

export interface ContainerRuntimePort {
  up(path: string, dockerCompose: string, projectName?: string): Promise<void>;
  list(
    path: string,
    dockerCompose: string,
    projectName?: string,
  ): Promise<ContainerRuntimeService[]>;
  inspect(containerIds: readonly string[]): Promise<ContainerInspection[]>;
  /** Traduce una ruta del proceso al host del daemon cuando la API corre en Docker. */
  resolveHostPath(path: string): Promise<string>;
  /** null si no se puede leer el archivo (ausente o inaccesible). */
  readFile(containerId: string, path: string): Promise<string | null>;
  /** Nombres de archivos, o [] si el directorio no es accesible. */
  listFiles(containerId: string, directory: string): Promise<string[]>;
  down(
    path: string,
    dockerCompose: string,
    projectName?: string,
  ): Promise<void>;
  delete(
    path: string,
    dockerCompose: string,
    projectName?: string,
  ): Promise<void>;
}

export interface ContainerRuntimeService {
  containerId: string;
  composeServiceName: string;
  /** Primer puerto publicado; 0 cuando no se publica ninguno. */
  port: number;
  status: 'created' | 'running' | 'paused' | 'restarting' | 'exited' | 'dead';
  health: 'starting' | 'healthy' | 'unhealthy' | 'none';
}

export interface ContainerInspection {
  readonly containerId: string;
  readonly image: string;
  readonly aliases: readonly string[];
  /** Todos los puertos TCP publicados en el host, sin duplicados. */
  readonly ports: readonly number[];
  readonly command: readonly string[];
  readonly env: Readonly<Record<string, string>>;
}
