import type {
  PortResult,
  ProbeOutcome,
} from '../infrastructure/probing/port-identification.js';

export const CONTAINER_PROBE_PORT = Symbol('CONTAINER_PROBE_PORT');

export interface ContainerProbe {
  outcome: ProbeOutcome;
  ports: PortResult[];
}

/** Identifica por red qué protocolo hablan los puertos publicados de un contenedor. */
export interface ContainerProbePort {
  probe(ports: readonly number[], host?: string): Promise<ContainerProbe>;
}
