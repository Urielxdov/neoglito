import { PROTOCOL_SERVICE_TYPES } from '../../../deployment/domain/services/protocol-service-type.js';
import { ServiceType } from '../../../deployment/domain/value-objects/service-type.js';
import type { ContainerProbePort } from '../../application/container-probe.port.js';
import { narrowTo, type ClassificationHandler } from './classification.js';
import { findingFromCommand } from './discriminator-command.js';

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

      const { outcome, ports } = await probe.probe(ctx.ports, ctx.host);
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
