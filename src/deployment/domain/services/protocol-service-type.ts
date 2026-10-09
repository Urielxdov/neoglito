import type { Protocol } from '../../../ports/infrastructure/probing/protocol-probes.js';
import { ServiceType } from '../value-objects/service-type.js';

/**
 * Categorías compatibles con cada protocolo. Las ambigüedades requieren evidencia adicional.
 * Record<Protocol, …>: si se agrega una sonda sin categoría, no compila.
 */
export const PROTOCOL_SERVICE_TYPES: Record<Protocol, readonly ServiceType[]> =
  {
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
    // También hay bases de datos con HTTP (Elasticsearch, CouchDB, etc.).
    http: [
      ServiceType.BACKEND,
      ServiceType.FRONTEND,
      ServiceType.REVERSE_PROXY,
      ServiceType.DATABASE,
    ],
  };
