export const HOST_PORT_USAGE_PORT = Symbol('HOST_PORT_USAGE_PORT');

export interface HostPortUsage {
  port: number;
  ownerId: string;
}

export interface HostPortUsagePort {
  getPublishedPorts(): Promise<HostPortUsage[]>;
  isPortAvailable(port: number): Promise<boolean>;
}
