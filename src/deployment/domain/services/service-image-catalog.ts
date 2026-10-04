import { ServiceType } from '../value-objects/service-type.js';

/**
 * Una regla agrupa imágenes que se comportan igual para la clasificación.
 * - Un solo candidato  → el handler de imagen resuelve.
 * - Varios candidatos  → el handler acota y la cadena sigue.
 * - [UNKNOWN] explícito → herramienta conocida que no es ningún tipo de servicio;
 *   se resuelve a propósito para que eslabones posteriores no la clasifiquen mal.
 *
 * `images` contiene nombres YA normalizados (ver normalizeImageRef):
 * sin registry, sin tag, sin digest y sin el prefijo `library/`.
 */
export interface ImageRule {
  readonly name: string;
  readonly images: readonly string[];
  readonly candidates: readonly ServiceType[];
}

export const SERVICE_IMAGE_CATALOG: readonly ImageRule[] = [
  // ── DATABASE ────────────────────────────────────────────────
  {
    name: 'PostgreSQL y derivados',
    images: [
      'postgres',
      'pgvector/pgvector',
      'postgis/postgis',
      'timescale/timescaledb',
      'bitnami/postgresql',
    ],
    candidates: [ServiceType.DATABASE],
  },
  {
    name: 'MySQL / MariaDB',
    images: ['mysql', 'bitnami/mysql', 'mariadb', 'bitnami/mariadb'],
    candidates: [ServiceType.DATABASE],
  },
  {
    name: 'SQL Server / Oracle',
    images: [
      'mssql/server',
      'gvenzl/oracle-xe',
      'gvenzl/oracle-free',
      'database/free',
    ],
    candidates: [ServiceType.DATABASE],
  },
  {
    name: 'NoSQL',
    images: [
      'mongo',
      'bitnami/mongodb',
      'cassandra',
      'couchdb',
      'neo4j',
      'influxdb',
    ],
    candidates: [ServiceType.DATABASE],
  },
  {
    name: 'Motores de búsqueda',
    images: [
      'elasticsearch',
      'elasticsearch/elasticsearch',
      'opensearchproject/opensearch',
    ],
    candidates: [ServiceType.DATABASE],
  },

  // ── CACHE ───────────────────────────────────────────────────
  {
    name: 'Memcached',
    images: ['memcached', 'bitnami/memcached'],
    candidates: [ServiceType.CACHE],
  },
  {
    name: 'Redis y compatibles (cache o broker de Celery)',
    images: [
      'redis',
      'bitnami/redis',
      'redis/redis-stack',
      'redis/redis-stack-server',
      'valkey/valkey',
      'bitnami/valkey',
    ],
    candidates: [ServiceType.CACHE, ServiceType.MESSAGE_BROKER],
  },

  // ── MESSAGE_BROKER ──────────────────────────────────────────
  {
    name: 'RabbitMQ',
    images: ['rabbitmq', 'bitnami/rabbitmq'],
    candidates: [ServiceType.MESSAGE_BROKER],
  },
  {
    name: 'Kafka y compatibles',
    images: [
      'apache/kafka',
      'bitnami/kafka',
      'confluentinc/cp-kafka',
      'redpandadata/redpanda',
    ],
    candidates: [ServiceType.MESSAGE_BROKER],
  },
  {
    name: 'Otros brokers',
    images: [
      'nats',
      'apache/activemq-artemis',
      'apache/activemq-classic',
      'eclipse-mosquitto',
    ],
    candidates: [ServiceType.MESSAGE_BROKER],
  },

  // ── REVERSE_PROXY ───────────────────────────────────────────
  {
    name: 'Proxies dedicados',
    images: [
      'traefik',
      'haproxy',
      'envoyproxy/envoy',
      'nginxproxy/nginx-proxy',
      'jc21/nginx-proxy-manager',
    ],
    candidates: [ServiceType.REVERSE_PROXY],
  },
  {
    name: 'Servidores web (proxy o estáticos)',
    images: [
      'nginx',
      'nginxinc/nginx-unprivileged',
      'bitnami/nginx',
      'caddy',
      'httpd',
    ],
    candidates: [ServiceType.REVERSE_PROXY, ServiceType.FRONTEND],
  },

  // ── Herramientas conocidas que no son servicios ─────────────
  {
    name: 'Herramientas de desarrollo y observabilidad',
    images: [
      'mongo-express',
      'dpage/pgadmin4',
      'adminer',
      'rediscommander/redis-commander',
      'provectuslabs/kafka-ui',
      'mher/flower',
      'axllent/mailpit',
      'mailhog/mailhog',
      'prometheuscommunity/postgres-exporter',
      'oliver006/redis_exporter',
      'nginx/nginx-prometheus-exporter',
    ],
    candidates: [ServiceType.UNKNOWN],
  },
];

/**
 * `docker.io/library/postgres:16-alpine@sha256:…` → `postgres`
 * `mcr.microsoft.com/mssql/server:2022-latest`    → `mssql/server`
 * `localhost:5000/miorg/billing:3445de0`          → `miorg/billing`
 */
export function normalizeImageRef(ref: string): string {
  let name = ref.trim().toLowerCase().split('@')[0];

  const tagColon = name.indexOf(':', name.lastIndexOf('/') + 1);
  if (tagColon !== -1) name = name.slice(0, tagColon);

  const parts = name.split('/');
  const first = parts[0];
  if (
    parts.length > 1 &&
    (first.includes('.') || first.includes(':') || first === 'localhost')
  ) {
    parts.shift();
  }
  if (parts.length > 1 && parts[0] === 'library') parts.shift();

  return parts.join('/');
}

function buildIndex(
  rules: readonly ImageRule[],
): ReadonlyMap<string, ImageRule> {
  const index = new Map<string, ImageRule>();
  for (const rule of rules) {
    for (const image of rule.images) {
      const existing = index.get(image);
      if (existing) {
        throw new Error(
          `Imagen "${image}" duplicada en "${existing.name}" y "${rule.name}"`,
        );
      }
      index.set(image, rule);
    }
  }
  return index;
}

const IMAGE_INDEX = buildIndex(SERVICE_IMAGE_CATALOG);

/** `undefined` = imagen fuera del catálogo → el handler de imagen debe devolver `pass`. */
export function lookupImage(ref: string): ImageRule | undefined {
  return IMAGE_INDEX.get(normalizeImageRef(ref));
}
