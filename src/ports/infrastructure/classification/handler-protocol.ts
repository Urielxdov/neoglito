import { PROTOCOL_SERVICE_TYPES } from '../../../deployment/domain/services/protocol-service-type.js';
import { ServiceType } from '../../../deployment/domain/value-objects/service-type.js';
import type {
  ContainerProbe,
  ContainerProbePort,
} from '../../application/container-probe.port.js';
import { narrowTo, type ClassificationHandler } from './classification.js';
import { findingFromCommand } from './discriminator-command.js';

const RETRY_INTERVAL_MS = 2000;
/**
 * Ventana total que toleramos a un contenedor para terminar de arrancar.
 * Un despliegue de "analyze" siempre parte de cero, así que `npm ci` en frío
 * (+ generación de Prisma, build, etc.) es el caso normal, no el raro: se
 * observaron arranques de hasta ~62s en un contenedor Node con dependencias
 * moderadas.
 */
const RETRY_BUDGET_MS = 90_000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Reintenta la sonda mientras no sea concluyente (nada escucha o nadie
 * respondió con un protocolo reconocido): un contenedor recién levantado
 * puede tardar en terminar su arranque (`npm ci`, migraciones, etc.) antes
 * de abrir el puerto. Se detiene en cuanto identifica algo o se agota el
 * presupuesto de tiempo.
 */
async function probeWithRetries(
  probe: ContainerProbePort,
  ports: readonly number[],
  host: string,
): Promise<ContainerProbe> {
  const deadline = Date.now() + RETRY_BUDGET_MS;
  let result = await probe.probe(ports, host);
  while (result.outcome.kind !== 'identified' && Date.now() < deadline) {
    await sleep(RETRY_INTERVAL_MS);
    result = await probe.probe(ports, host);
  }
  return result;
}

export function protocolHandlerWith(
  probe: ContainerProbePort,
): ClassificationHandler {
  return {
    async handle(ctx, candidates, facts) {
      if (ctx.ports.length === 0) {
        facts.ports = [];
        // No publicar un puerto no prueba que no haya listeners internos.
        // Solo acotamos a tareas cuando el comando aporta esa evidencia.
        return findingFromCommand(ctx.command.join(' '))
          ? narrowTo(
              candidates,
              [ServiceType.WORKER, ServiceType.SCHEDULER],
              'comando de tarea sin puertos publicados',
            )
          : { kind: 'pass' };
      }

      const { outcome, ports } = await probeWithRetries(
        probe,
        ctx.ports,
        ctx.host,
      );
      facts.ports = ports;
      if (outcome.kind === 'no_listeners') {
        return narrowTo(
          candidates,
          [ServiceType.WORKER, ServiceType.SCHEDULER],
          'protocolo: nada escucha',
        );
      }
      if (outcome.kind !== 'identified') return { kind: 'pass' };

      const supported = [
        ...new Set(
          outcome.protocols.flatMap(
            (protocol) => PROTOCOL_SERVICE_TYPES[protocol],
          ),
        ),
      ];
      return narrowTo(
        candidates,
        supported,
        `protocolo: ${outcome.protocols.join(', ')}`,
      );
    },
  };
}
