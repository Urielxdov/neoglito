import { Injectable } from '@nestjs/common';
import type {
  ContainerProbe,
  ContainerProbePort,
} from '../../application/container-probe.port.js';
import { probeContainer } from './port-identification.js';
import type { Protocol } from './protocol-probes.js';

/**
 * Orden en que se prueban las sondas client-first cuando el puerto guarda silencio.
 * Primero las de respuesta binaria muy específica; HTTP al final porque casi
 * cualquier servidor web contesta algo y es el protocolo más genérico.
 */
const PROBE_ORDER: readonly Protocol[] = [
  'mysql',
  'nats',
  'postgres',
  'mongo',
  'resp',
  'memcached',
  'amqp',
  'kafka',
  'mqtt',
  'http',
];

/** Host desde el que se alcanzan los puertos publicados por los contenedores. */
const DEFAULT_PROBE_HOST = '127.0.0.1';

@Injectable()
export class TcpContainerProbeService implements ContainerProbePort {
  private readonly host =
    process.env.CONTAINER_PROBE_HOST ?? DEFAULT_PROBE_HOST;

  probe(ports: readonly number[], host = this.host): Promise<ContainerProbe> {
    return probeContainer({ host, ports }, PROBE_ORDER);
  }
}
