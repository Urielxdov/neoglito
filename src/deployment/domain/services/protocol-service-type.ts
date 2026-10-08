import type { ProbeOutcome } from '../../../ports/infrastructure/port-identification.js';
import type { Protocol } from '../../../ports/infrastructure/protocol-probes.js';
import { ServiceType } from '../value-objects/service-type.js';

/**
 * Categorías compatibles con cada protocolo, de la más probable a la menos.
 * Record<Protocol, …>: si se agrega una sonda sin categoría, no compila.
 */
export const PROTOCOL_SERVICE_TYPES: Record<Protocol, readonly ServiceType[]> = {
  mysql: [ServiceType.DATABASE],
  postgres: [ServiceType.DATABASE],
  mongo: [ServiceType.DATABASE],
  // Redis/Valkey se usa sobre todo como cache, aunque también como broker (Celery, BullMQ).
  resp: [ServiceType.CACHE, ServiceType.MESSAGE_BROKER],
  memcached: [ServiceType.CACHE],
  nats: [ServiceType.MESSAGE_BROKER],
  amqp: [ServiceType.MESSAGE_BROKER],
  kafka: [ServiceType.MESSAGE_BROKER],
  mqtt: [ServiceType.MESSAGE_BROKER],
  // Por red no se distingue una API de un frontend o un proxy: se asume BACKEND.
  http: [ServiceType.BACKEND, ServiceType.FRONTEND, ServiceType.REVERSE_PROXY],
};

/** Traduce el resultado de las sondas de un contenedor a su categoría de servicio. */
export function resolveServiceType(outcome: ProbeOutcome): ServiceType {
  if (outcome.kind !== 'identified') return ServiceType.UNKNOWN;

  const [protocol] = outcome.protocols;
  return PROTOCOL_SERVICE_TYPES[protocol][0] ?? ServiceType.UNKNOWN;
}
