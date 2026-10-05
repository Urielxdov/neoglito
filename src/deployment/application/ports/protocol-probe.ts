import type { Buffer } from 'node:buffer';
import type { ProbeResult } from '../../domain/value-objects/probe-result.js';
import type { ServiceType } from '../../domain/value-objects/service-type.js';

/** Contrato para reconocer un protocolo mediante una comprobación de red. */
export interface ProtocolProbe {
  /** Identificador del protocolo, por ejemplo: postgres, resp, amqp o http. */
  readonly protocol: string;
  /** Tipos de servicio compatibles con este protocolo. */
  readonly implies: readonly ServiceType[];
  /** Pista para ordenar las comprobaciones; no determina el tipo de servicio. */
  readonly defaultPorts: readonly number[];
  /** Indica quién envía el primer mensaje del protocolo. */
  readonly speaksFirst: 'server' | 'client';
  probe(host: string, port: number, banner: Buffer | null): Promise<ProbeResult>;
}
