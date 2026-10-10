---
tags:
  - neoglito
  - ports
  - documentacion-tecnica
funcionalidad: ports
actualizado: 2026-10-10
---

# Ports · pipeline: imagen y protocolo

## Etapa 1: imagen

imageHandler llama lookupImage(ctx.image). Si no hay regla, devuelve pass. Si la regla contiene exclusivamente UNKNOWN, resuelve UNKNOWN directamente. Para otros candidatos usa narrowTo con `imagen: nombre de regla`.

normalizeImageRef aplica trim/minúsculas, quita digest tras @ y tag después del último slash. Quita registry cuando el primer segmento contiene punto, dos puntos o es localhost; elimina library si corresponde. Conserva el namespace restante.

| Referencia | Normalizada |
| --- | --- |
| docker.io/library/postgres:16-alpine@sha256:ejemplo | postgres |
| mcr.microsoft.com/mssql/server:2022-latest | mssql/server |
| localhost:5000/miorg/billing:version | miorg/billing |

El índice se construye al cargar el módulo y lanza si una imagen está repetida entre reglas. No consulta Docker Hub, manifests o procesos para comprobar que una imagen etiquetada cumpla su rol.

## Catálogo actual

| Grupo | Imágenes normalizadas | Candidatos |
| --- | --- | --- |
| PostgreSQL | postgres, pgvector/pgvector, postgis/postgis, timescale/timescaledb, bitnami/postgresql | DATABASE |
| MySQL/MariaDB | mysql, bitnami/mysql, mariadb, bitnami/mariadb | DATABASE |
| SQL Server/Oracle | mssql/server, gvenzl/oracle-xe, gvenzl/oracle-free, database/free | DATABASE |
| NoSQL | mongo, bitnami/mongodb, cassandra, couchdb, neo4j, influxdb | DATABASE |
| Búsqueda | elasticsearch, elasticsearch/elasticsearch, opensearchproject/opensearch | DATABASE |
| Memcached | memcached, bitnami/memcached | CACHE |
| Redis/Valkey | redis, bitnami/redis, redis/redis-stack, redis/redis-stack-server, valkey/valkey, bitnami/valkey | CACHE, MESSAGE_BROKER |
| RabbitMQ | rabbitmq, bitnami/rabbitmq | MESSAGE_BROKER |
| Kafka | apache/kafka, bitnami/kafka, confluentinc/cp-kafka, redpandadata/redpanda | MESSAGE_BROKER |
| Otros brokers | nats, apache/activemq-artemis, apache/activemq-classic, eclipse-mosquitto | MESSAGE_BROKER |
| Proxy dedicado | traefik, haproxy, envoyproxy/envoy, nginxproxy/nginx-proxy, jc21/nginx-proxy-manager | REVERSE_PROXY |
| Servidor web | nginx, nginxinc/nginx-unprivileged, bitnami/nginx, caddy, httpd | REVERSE_PROXY, FRONTEND |

Herramientas resueltas UNKNOWN: mongo-express, dpage/pgadmin4, adminer, rediscommander/redis-commander, provectuslabs/kafka-ui, mher/flower, axllent/mailpit, mailhog/mailhog, prometheuscommunity/postgres-exporter, oliver006/redis_exporter y nginx/nginx-prometheus-exporter.

Una regla de tipo único finaliza antes de sondear. Por ejemplo, postgres se clasifica DATABASE aunque no publique un puerto. Clasificar por esa imagen no verifica disponibilidad del protocolo PostgreSQL.

## Etapa 2: protocolo sin publicaciones

Si ctx.ports está vacío, escribe facts.ports = []. Consulta findingFromCommand: si reconoce tarea, acota a WORKER/SCHEDULER para habilitar el discriminador de comando. Todavía no selecciona el tipo específico. Si no reconoce tarea, hace pass.

No publicar puertos no prueba que no existan listeners internos. Una imagen nginx o redis aún puede pasar a configuración/uso sin red; una imagen desconocida con `node server.js` mantiene los ocho tipos y acaba unknown porque ningún discriminador cubre ese conjunto completo.

## Etapa 2: protocolo con publicaciones

Llama probe.probe(ctx.ports, ctx.host) y guarda sus PortResult. no_listeners acota a WORKER/SCHEDULER. unidentified hace pass. identified reúne la **unión** de tipos compatibles con todos los protocolos reconocidos y la intersecta con los candidatos actuales.

| Protocolo | Tipos compatibles |
| --- | --- |
| mysql, postgres, mongo | DATABASE |
| resp | CACHE, MESSAGE_BROKER |
| memcached | CACHE |
| nats, amqp, kafka, mqtt | MESSAGE_BROKER |
| http | BACKEND, FRONTEND, REVERSE_PROXY, DATABASE |

Múltiples protocolos pueden mantener varios tipos; no se elige un puerto ganador ni se intersectan las categorías de cada puerto entre sí. El orden final viene del conjunto de candidatos original.

La evidencia es `protocolo: lista` o `protocolo: nada escucha`. No se valida el número de puerto como indicio de tecnología: 5432 solo importa si la respuesta se reconoce como postgres.

## Consecuencias

no_listeners significa que las conexiones no llegaron a establecerse desde el host configurado. Puede deberse a red, firewall o inicio tardío. La acotación a tareas es una heurística del pipeline. Una imagen redis acotada a CACHE/BROKER cuyos puertos se observen todos closed produce conflict antes de poder evaluar sus consumidores.

Un banner no reconocido se queda unidentified sin probar peticiones client-first en ese puerto. Si la imagen había dejado nginx como FRONTEND/REVERSE_PROXY, un protocolo incompatible puede producir conflict; si la imagen ya resolvió, no se ejecuta este contraste.

Los detalles de bytes y temporización están en [[Ports - Sondas TCP y mensajes]].

Volver a [[Ports - Indice]].

## Fuentes del código

- [src/ports/infrastructure/classification/handler-image.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/handler-image.ts)
- [src/ports/infrastructure/classification/handler-protocol.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/handler-protocol.ts)
- [src/deployment/domain/services/service-image-catalog.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/domain/services/service-image-catalog.ts)
- [src/deployment/domain/services/protocol-service-type.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/domain/services/protocol-service-type.ts)
