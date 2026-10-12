from pathlib import Path
import re

base = Path(__file__).resolve().parent
repo = base.parent.parent
out = base / 'Telemetry'
out.mkdir(exist_ok=True)

notes = {
'Telemetry - Indice': ('''# Telemetry · documentación técnica

`src/telemetry` implementa la observabilidad de neoglito con OpenTelemetry: **traces, metrics y logs** de la propia API y de los contenedores que la plataforma despliega. Un OpenTelemetry Collector independiente recibe los datos, y la API actúa como backend de observabilidad: los valida, los guarda en PostgreSQL mediante Prisma y los expone con endpoints protegidos por JWT.

Inferido del código revisado el **11 de octubre de 2026**. Los ejemplos ilustran contratos y formatos; no proceden de una ejecución contra una instalación en producción.

## Recorrido de lectura

1. [[Telemetry - Flujo]]: recorrido completo de un dato, desde el emisor hasta la consulta.
2. [[Telemetry - Collector y receptor]]: configuración del collector, receptor OTLP en la API y autenticación por token.
3. [[Telemetry - Inyeccion en despliegues]]: cómo se configuran los contenedores desplegados y los agentes de auto-instrumentación.
4. [[Telemetry - API, ORM y retencion]]: instrumentación de la API, modelo de datos, consulta y purga.
5. [[Telemetry - Configuracion diagnostico y pruebas]]: variables, ejecución, fallos y alcance.

## Alcance

- El collector es el contenedor oficial `otel/opentelemetry-collector-contrib`; no es código TypeScript del repositorio. Lo que sí es código propio: el backend receptor, el inyector, el SDK de la API, la persistencia y la retención.
- La API en el puerto 3000 conserva sus responsabilidades; el collector escucha aparte en el puerto **4318** (OTLP/HTTP).
- Cada despliegue recibe su propio token. La API usa un token de sistema.
- Quedan fuera: .NET y Go, OTLP/gRPC (puerto 4317), OTLP protobuf directo a la API y la interfaz en `apps/web`.
''', ['src/telemetry/README.md', 'src/telemetry/telemetry.module.ts', 'docker-compose.yml', 'src/app.module.ts']),
'Telemetry - Flujo': ('''# Telemetry · flujo

## Vista general

```mermaid
flowchart LR
    subgraph Emisores
        A[API neoglito<br/>SDK Node, token de sistema]
        D[Contenedores desplegados<br/>OTEL_* + agente, token del deployment]
    end
    A -->|OTLP/HTTP :4318| C[otel-collector<br/>contrib]
    D -->|OTLP/HTTP :4318| C
    C -->|OTLP JSON + Authorization| I[API POST /telemetry/ingest/v1/*]
    I --> G{TelemetryIngestGuard}
    G -->|token válido| U[IngestTelemetryUseCase]
    G -->|inválido| X[401]
    U --> P[(PostgreSQL)]
    P --> Q[GET /deployment/:id/telemetry/*<br/>JWT]
    R[Retención horaria] --> P
```

Los emisores nunca hablan directamente con la API: siempre pasan por el collector. El collector conserva el header `Authorization` de cada emisor y lo reenvía; así la API sabe a qué despliegue pertenece cada lote.

## Alta de un despliegue

```mermaid
sequenceDiagram
    participant U as DeployComposeUseCase
    participant T as DeploymentTelemetryTokenPort
    participant S as YamlDeploymentComposeService
    participant J as OtelComposeInjector
    participant D as Docker Compose
    U->>U: Crear Deployment en estado pending
    U->>T: issue(deploymentId)
    T-->>U: token ngt_… (solo se guarda su hash SHA-256)
    U->>S: prepare(compose, deploymentId, configuración, {token, projectId})
    S->>J: inject(document, contexto) antes de las variables del usuario
    J-->>S: YAML con OTEL_*, extra_hosts y agentes
    S-->>U: Compose preparado
    U->>D: up
    Note over D: Los contenedores empiezan a emitir al collector
```

El token en claro existe únicamente dentro del YAML preparado del despliegue. En base de datos solo se almacena el hash. Si el arranque falla, el caso de uso revoca el token; si se detiene el despliegue, `StopDeploymentUseCase` también lo revoca.

## Camino de un lote de telemetría

```mermaid
sequenceDiagram
    participant E as Emisor
    participant C as Collector :4318
    participant G as TelemetryIngestGuard
    participant K as TelemetryIngestController
    participant M as otlp-json-mapper
    participant R as TelemetryRepositoryPort
    E->>C: POST /v1/traces con Authorization: Bearer token
    C->>C: batch por valor de authorization
    C->>K: POST /telemetry/ingest/v1/traces (JSON) + Authorization
    K->>G: validar token
    G-->>K: deploymentId o null (sistema)
    K->>M: mapTraces(body, deploymentId)
    M-->>K: entidades de dominio
    K->>R: IngestTelemetryUseCase.spans(...)
    R-->>K: guardado en lotes
    K-->>C: 200 con cuerpo vacío {}
```

El controller responde `{}` con `@Res()` para saltarse `ApiResponseInterceptor`: los exporters OTLP esperan la respuesta del protocolo, no el envelope `{success, data, error, meta}`. Los errores sí pasan por `ApiExceptionFilter`.

## Consulta

El frontend, o cualquier cliente con JWT, consulta `GET /deployment/:deploymentId/telemetry/{traces,metrics,logs}`. La respuesta usa el envelope normal y devuelve `{ items, nextBefore }` con paginación por cursor. Detalles en [[Telemetry - API, ORM y retencion]].

## Dos identidades de emisor

| Emisor | Token | `deploymentId` guardado |
| --- | --- | --- |
| Contenedor desplegado | `ngt_…` emitido por despliegue | UUID del `Deployment` |
| API neoglito | `TELEMETRY_SYSTEM_TOKEN` | `null` |

Un `deploymentId` nulo significa telemetría de la propia API. El endpoint de consulta filtra siempre por un despliegue existente, así que no la devuelve.

Continúa con [[Telemetry - Collector y receptor]] para el detalle de cada salto.
''', ['src/telemetry/README.md', 'src/deployment/application/use-cases/deploy-compose.use-case.ts', 'src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts', 'src/telemetry/presentation/telemetry-ingest.controller.ts', 'src/telemetry/presentation/telemetry-ingest.guard.ts', 'src/telemetry/presentation/otlp/otlp-json-mapper.ts', 'src/telemetry/application/use-cases/ingest-telemetry.use-case.ts', 'src/telemetry/infrastructure/persistence/prisma-deployment-telemetry-token.repository.ts']),
'Telemetry - Collector y receptor': ('''# Telemetry · collector y receptor

## El collector

Se ejecuta como servicio `otel-collector` de `docker-compose.yml` con la imagen `otel/opentelemetry-collector-contrib:0.162.0`. Se necesita la distribución *contrib* porque la extensión `headers_setter` no está en la distribución base. La configuración se monta de solo lectura desde `src/telemetry/infrastructure/collector/otel-collector.yaml`, y el puerto 4318 se publica en el host.

```mermaid
flowchart LR
    R[receiver otlp<br/>http 0.0.0.0:4318<br/>include_metadata] --> M[memory_limiter]
    M --> B[batch<br/>metadata_keys: authorization]
    B --> X[exporter otlphttp/neoglito<br/>encoding json]
    H[extension headers_setter<br/>Authorization from_context] -.autentica.-> X
```

| Pieza | Configuración | Motivo |
| --- | --- | --- |
| `receivers.otlp.protocols.http` | `0.0.0.0:4318`, `include_metadata: true` | Expone los headers de entrada como metadata del contexto |
| `extensions.headers_setter` | `Authorization` ← `from_context: authorization` | Reenvía el token del emisor hasta la API |
| `processors.memory_limiter` | 256 MiB, picos de 64 MiB | Protege el contenedor |
| `processors.batch` | 1024 elementos o 5 s, `metadata_keys: [authorization]` | Un lote por token: sin esto se mezclarían datos de despliegues distintos |
| `exporters.otlphttp/neoglito` | `endpoint: ${env:NEOGLITO_INGEST_URL}`, `encoding: json`, `compression: none`, reintentos hasta 120 s | La API solo acepta JSON |

Los pipelines de `traces`, `metrics` y `logs` usan los mismos receptor, procesadores y exporter. El exporter añade `/v1/traces`, `/v1/metrics` y `/v1/logs` al endpoint configurado; por eso `NEOGLITO_INGEST_URL` vale `http://api:3000/telemetry/ingest` y la API publica rutas bajo `/telemetry/ingest/v1/`.

## El receptor en la API

`TelemetryIngestController` está en `src/telemetry/presentation` y se oculta de Swagger con `@ApiExcludeController`.

| Ruta | Método | Cuerpo |
| --- | --- | --- |
| `/telemetry/ingest/v1/traces` | POST | OTLP JSON `ExportTraceServiceRequest` |
| `/telemetry/ingest/v1/metrics` | POST | OTLP JSON `ExportMetricsServiceRequest` |
| `/telemetry/ingest/v1/logs` | POST | OTLP JSON `ExportLogsServiceRequest` |

- Si el `Content-Type` no es `application/json`, responde 415.
- `main.ts` sube el límite del cuerpo JSON a 10 MB (`app.useBodyParser('json', { limit: '10mb' })`); el valor por defecto de Express, 100 kB, no alcanza para lotes OTLP.
- `otlp-json-mapper.ts` traduce el JSON OTLP a entidades de dominio: identificadores en hexadecimal, tiempos en nanosegundos (cadenas) a `Date`, `AnyValue` a JSON plano y `service.name` del recurso a `serviceName`. Vive en `presentation/otlp/` para que la capa de aplicación no importe de infraestructura.
- `IngestTelemetryUseCase` recibe solo entidades de dominio y llama al repositorio si hay elementos.

## Autenticación del receptor

`TelemetryIngestGuard` reemplaza a `JwtAuthGuard` en esta ruta.

```mermaid
flowchart TD
    A[Authorization] --> B{Coincide con Bearer + token?}
    B -->|No| X[401 Token de telemetría requerido]
    B -->|Sí| C{Igual a TELEMETRY_SYSTEM_TOKEN?}
    C -->|Sí| S[deploymentId = null]
    C -->|No| D{Hash SHA-256 existe y no revocado?}
    D -->|Sí| T[deploymentId del token]
    D -->|No| Y[401 Token de telemetría inválido]
```

- Acepta `Bearer` seguido de espacio o de `%20`: algunos SDK codifican el espacio en `OTEL_EXPORTER_OTLP_HEADERS`.
- El token de sistema se compara por digests SHA-256 con `timingSafeEqual`, así la comparación no depende de la longitud.
- Los tokens por despliegue tienen el formato `ngt_` más 32 bytes aleatorios en base64url. Solo se guarda el hash (`hashTelemetryToken`). `issue` hace `upsert` por `deploymentId`, de modo que volver a desplegar reemplaza el token anterior y quita la revocación.
- Un 401 hace que el collector descarte el lote (`Exporting failed. Dropping data`), porque los errores 4xx no son reintentables.

## Evitar un bucle

La API se instrumenta a sí misma y envía telemetría al collector, que la reenvía a `/telemetry/ingest`. Si esa ruta también generara spans, cada ingesta produciría más telemetría. La instrumentación HTTP usa `ignoreIncomingRequestHook` para ignorar peticiones cuya URL empieza por `/telemetry/ingest` (`INGEST_PATH_PREFIX`).

Para configurar los emisores consulta [[Telemetry - Inyeccion en despliegues]] y [[Telemetry - API, ORM y retencion]].
''', ['src/telemetry/infrastructure/collector/otel-collector.yaml', 'src/telemetry/infrastructure/collector/README.md', 'docker-compose.yml', 'src/main.ts', 'src/telemetry/presentation/telemetry-ingest.controller.ts', 'src/telemetry/presentation/telemetry-ingest.guard.ts', 'src/telemetry/presentation/otlp/otlp-json-mapper.ts', 'src/telemetry/application/use-cases/ingest-telemetry.use-case.ts', 'src/telemetry/infrastructure/persistence/prisma-deployment-telemetry-token.repository.ts', 'src/telemetry/infrastructure/sdk/start-telemetry-sdk.ts']),
'Telemetry - Inyeccion en despliegues': ('''# Telemetry · inyección en despliegues

La inyección ocurre en `YamlDeploymentComposeService.prepare()`. Ese método ya reescribía `environment` y `ports` del Compose del usuario; ahora, si recibe configuración de telemetría y existe un inyector, invoca `OtelComposeInjector.inject()` **antes** de aplicar las variables del usuario.

```mermaid
flowchart TD
    A[Servicio del Compose] --> B[detectServiceRuntime]
    B -->|Base de datos, cache, broker o proxy| N[Se omite: no se toca]
    B -->|Servicio de aplicación| C[Añadir variables OTEL_*]
    C --> D[Añadir extra_hosts host.docker.internal]
    D --> E{Lenguaje detectado con certeza<br/>y auto-instrumentación activa?}
    E -->|No| F[Solo variables]
    E -->|Sí| G[Servicio init + volumen + variable del agente]
```

## Qué servicios se instrumentan

`detectServiceRuntime` reutiliza `lookupImage` y `normalizeImageRef` del catálogo de imágenes de despliegue. Si la imagen es una base de datos, cache, broker o proxy conocido, el servicio **no** se instrumenta.

| Caso | Resultado |
| --- | --- |
| `image` conocida en el catálogo (postgres, redis, nginx…) | No instrumentable |
| `image` de `node`, `python` o familias Java (`eclipse-temurin`, `openjdk`, `amazoncorretto`, `maven`, `gradle`, `tomcat`…) | Instrumentable con runtime conocido |
| `build:` con Dockerfile cuya última etapa `FROM` es una imagen de esos lenguajes | Runtime de esa imagen |
| `build:` sin base reconocible | Se miran archivos marcadores: `package.json`, `requirements.txt`/`pyproject.toml`/`Pipfile`/`setup.py`, `pom.xml`/`build.gradle*` |
| Varios marcadores a la vez, `FROM` con `ARG` o contexto remoto | Instrumentable sin agente: **nunca se adivina** el lenguaje |

Una base `alpine` activa la variante musl del agente de Python.

## Variables inyectadas

| Variable | Valor |
| --- | --- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `TELEMETRY_DEPLOYMENT_COLLECTOR_ENDPOINT` o `http://host.docker.internal:4318` |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` |
| `OTEL_EXPORTER_OTLP_HEADERS` | `authorization=Bearer%20<token>` |
| `OTEL_SERVICE_NAME` | Nombre del servicio en el Compose |
| `OTEL_RESOURCE_ATTRIBUTES` | `neoglito.deployment.id=…,neoglito.project.id=…` (se anexa si ya existía) |
| `OTEL_TRACES_EXPORTER`, `OTEL_METRICS_EXPORTER`, `OTEL_LOGS_EXPORTER` | `otlp` |

Se añade también `extra_hosts: host.docker.internal:host-gateway` para que el contenedor alcance el puerto 4318 publicado en el host.

**Regla de precedencia:** el inyector no pisa una clave que el Compose original o el usuario ya definieron (`setDefault`). Las variables que admiten valores combinados (`NODE_OPTIONS`, `JAVA_TOOL_OPTIONS`, `PYTHONPATH`, `OTEL_RESOURCE_ATTRIBUTES`) se anexan en lugar de sustituirse.

## Auto-instrumentación por lenguaje

Si el lenguaje se detecta y `TELEMETRY_AUTO_INSTRUMENTATION` no vale `false`, se monta un agente de las imágenes del OpenTelemetry Operator con tags fijados:

| Runtime | Imagen | Variable que activa el agente |
| --- | --- | --- |
| Node | `autoinstrumentation-nodejs:0.78.0` | `NODE_OPTIONS=--require <ruta>/autoinstrumentation.js` |
| Java | `autoinstrumentation-java:2.32.0` | `JAVA_TOOL_OPTIONS=-javaagent:<ruta>/javaagent.jar` |
| Python | `autoinstrumentation-python:0.66b1` | `PYTHONPATH` + `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true` |

Las imágenes se pueden cambiar con `TELEMETRY_AUTOINSTRUMENTATION_NODEJS_IMAGE`, `…_JAVA_IMAGE` y `…_PYTHON_IMAGE`.

```mermaid
flowchart LR
    I[servicio neoglito-otel-init-nodejs<br/>imagen del agente, user 0] -->|cp al volumen| V[(volumen neoglito-otel-nodejs)]
    V -->|montado :ro| A[Servicio de la aplicación]
    I -.service_completed_successfully.-> A
```

1. Se crea un servicio init `neoglito-otel-init-<variante>` que copia el agente al volumen nombrado `neoglito-otel-<variante>`. Corre como `user: '0'` porque el volumen nuevo pertenece a root.
2. La aplicación monta ese volumen en solo lectura y espera al init con `depends_on: service_completed_successfully`.
3. Si varios servicios usan el mismo lenguaje, comparten un único init y un único volumen.

Los servicios init terminan en estado `exited`. Para que no aparezcan como servicios del usuario, `DockerComposeRuntime.list()` filtra los que empiezan por `neoglito-otel-init-` (`INJECTED_SERVICE_PREFIX`).

## Ciclo de vida del token

| Evento | Acción |
| --- | --- |
| Crear despliegue | `issue()` y paso del token a `prepare()` como cuarto argumento |
| Fallo durante el arranque | `revoke()` en el `catch` de `DeployComposeUseCase` |
| Detener despliegue | `StopDeploymentUseCase` llama a `revoke()` |
| Borrar el despliegue | La fila del token se elimina en cascada |

Con `TELEMETRY_ENABLED=false` no se emite token ni se inyecta nada. Más sobre la preparación del Compose en [[Deployment - Preparacion Compose]].
''', ['src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts', 'src/deployment/application/use-cases/deploy-compose.use-case.ts', 'src/deployment/application/ports/deployment-compose.port.ts', 'src/telemetry/application/ports/telemetry-injector.port.ts', 'src/telemetry/infrastructure/injection/otel-compose-injector.service.ts', 'src/telemetry/infrastructure/injection/service-runtime-detector.ts', 'src/telemetry/infrastructure/injection/auto-instrumentation-catalog.ts', 'src/container/infrastructure/docker/docker-compose-runtime.service.ts']),
'Telemetry - API, ORM y retencion': ('''# Telemetry · API, ORM y retención

## Instrumentación de la propia API

`startTelemetrySdk()` arranca el SDK de Node (`@opentelemetry/sdk-node`) y se llama desde `main.ts` **antes** del `import()` dinámico de `AppModule`, después de cargar `.env`. Así las instrumentaciones parchean las librerías antes de que se importen.

| Elemento | Detalle |
| --- | --- |
| Condición | Solo arranca si `TELEMETRY_ENABLED` no es `false` y existen `OTEL_EXPORTER_OTLP_ENDPOINT` y `TELEMETRY_SYSTEM_TOKEN` |
| Recurso | `service.name` = `OTEL_SERVICE_NAME` o `neoglito-api` |
| Exporters | OTLP/HTTP a `<endpoint>/v1/{traces,metrics,logs}` con `authorization: Bearer <token de sistema>` |
| Métricas | Exportación periódica cada 30 s |
| Instrumentaciones | `http`, `express`, `nestjs-core`, `pg`, `redis` |
| ESM | Registra `@opentelemetry/instrumentation/hook.mjs` porque el proyecto es ESM |
| Cierre | En `SIGTERM`/`SIGINT` vacía los lotes pendientes y reemite la señal |

`TelemetryLogger` extiende `ConsoleLogger` y además emite cada línea de log como `LogRecord` de OpenTelemetry. `main.ts` crea la app con `bufferLogs: true` y llama a `app.useLogger(new TelemetryLogger())`.

## Modelo de datos

Definido en `prisma/models/telemetry.prisma`; la migración es `prisma/migrations/20261011120000_add_telemetry/migration.sql`.

```mermaid
erDiagram
    Deployment ||--o| DeploymentTelemetryToken : tiene
    Deployment ||--o{ TelemetrySpan : genera
    Deployment ||--o{ TelemetryMetricPoint : genera
    Deployment ||--o{ TelemetryLog : genera
```

| Modelo | Campos principales | Índices |
| --- | --- | --- |
| `DeploymentTelemetryToken` | `deploymentId` único, `tokenHash` único, `createdAt`, `revokedAt` | Los dos únicos |
| `TelemetrySpan` | `traceId`, `spanId`, `parentSpanId`, `name`, `kind`, `startTime`, `endTime`, `durationMs`, `statusCode`, `statusMessage`, `attributes`, `resource` | `(deploymentId, startTime)`, `traceId`, `startTime` |
| `TelemetryMetricPoint` | `name`, `unit`, `type`, `time`, `value` (Float, opcional), `histogram` (Json, opcional), `attributes` | `(deploymentId, name, time)`, `time` |
| `TelemetryLog` | `time`, `severity`, `body`, `traceId`, `spanId`, `attributes` | `(deploymentId, time)`, `time` |

`deploymentId` es opcional en las tres tablas de datos: nulo equivale a telemetría de la propia API. La relación con `Deployment` usa `onDelete: Cascade`, así que borrar un despliegue elimina su telemetría. Los repositorios guardan con `createMany` en lotes de 1000.

## Consulta para el frontend

`TelemetryQueryController` está bajo `@Controller('deployment/:deploymentId/telemetry')`, con `JwtAuthGuard` y documentado en Swagger (`Telemetry`). No es el receptor: cada controller tiene reglas distintas.

| | Receptor (`TelemetryIngestController`) | Consulta (`TelemetryQueryController`) |
| --- | --- | --- |
| Llama | Collector | Frontend |
| Auth | Token Bearer de telemetría | JWT de usuario |
| Respuesta | `{}` fuera del envelope | Envelope `ApiResponse` |
| Swagger | Excluido | Documentado |

| Ruta | Filtros específicos |
| --- | --- |
| `GET /deployment/:id/telemetry/traces` | — |
| `GET /deployment/:id/telemetry/metrics` | `name` |
| `GET /deployment/:id/telemetry/logs` | `severity` (se normaliza a mayúsculas) |

Filtros comunes: `service`, `from`, `to` (fechas ISO), `before` (cursor) y `limit`. Un valor de fecha inválido responde 400. El límite por defecto es 100 y el máximo 500.

```json
{
  "success": true,
  "data": {
    "items": [],
    "nextBefore": "2026-10-11T15:04:05.000Z"
  },
  "error": null,
  "meta": null
}
```

La paginación es por cursor de tiempo: el caso de uso pide `limit + 1` filas, devuelve `limit` y, si hubo una más, `nextBefore` es el instante del último elemento devuelto. Se envía como `before` en la siguiente petición. Si el despliegue no existe responde 404.

## Retención

`TelemetryRetentionService` ejecuta `PurgeExpiredTelemetryUseCase` al iniciar y cada hora (`setInterval` con `unref`, sin `@nestjs/schedule`). Borra lo anterior a `TELEMETRY_RETENTION_DAYS` (7 por defecto) en lotes de 5000 filas con un máximo de 100 rondas por ejecución. Un fallo se registra y no detiene la aplicación. Una ejecución en curso no se solapa con la siguiente.

Para el uso, variables y fallos continúa en [[Telemetry - Configuracion diagnostico y pruebas]].
''', ['src/telemetry/infrastructure/sdk/start-telemetry-sdk.ts', 'src/telemetry/infrastructure/sdk/telemetry-logger.ts', 'src/main.ts', 'prisma/models/telemetry.prisma', 'prisma/migrations/20261011120000_add_telemetry/migration.sql', 'src/telemetry/infrastructure/persistence/prisma-telemetry.repository.ts', 'src/telemetry/presentation/telemetry-query.controller.ts', 'src/telemetry/application/use-cases/query-deployment-telemetry.use-case.ts', 'src/telemetry/application/use-cases/purge-expired-telemetry.use-case.ts', 'src/telemetry/infrastructure/retention/telemetry-retention.service.ts']),
'Telemetry - Configuracion diagnostico y pruebas': ('''# Telemetry · configuración, diagnóstico y pruebas

## Variables

| Variable | Valor por defecto | Efecto |
| --- | --- | --- |
| `TELEMETRY_ENABLED` | `true` | `false` desactiva el SDK de la API, la emisión de tokens, la inyección y la purga |
| `TELEMETRY_SYSTEM_TOKEN` | vacío | Token de la propia API. Sin él, el SDK de la API no arranca y no se acepta telemetría de sistema |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-collector:4318` en Compose | Collector visto desde la API |
| `TELEMETRY_DEPLOYMENT_COLLECTOR_ENDPOINT` | `http://host.docker.internal:4318` | Collector visto desde los contenedores desplegados |
| `NEOGLITO_INGEST_URL` | `http://api:3000/telemetry/ingest` | Destino del exporter del collector |
| `TELEMETRY_AUTO_INSTRUMENTATION` | `true` | `false` inyecta solo variables `OTEL_*`, sin agentes |
| `TELEMETRY_RETENTION_DAYS` | `7` | Antigüedad máxima. Un valor inválido o negativo vuelve a 7 |
| `TELEMETRY_AUTOINSTRUMENTATION_{NODEJS,JAVA,PYTHON}_IMAGE` | Tags fijados | Sustituye la imagen del agente |

Las variables se leen de forma perezosa mediante funciones de `telemetry-config.ts`, porque el `.env` se carga después de importar los módulos. En Compose, la API recibe estas variables en su bloque `environment`. El ejemplo está en `.env.example`.

## Puesta en marcha

1. Definir `TELEMETRY_SYSTEM_TOKEN` en `.env` con un valor aleatorio.
2. Ejecutar `docker compose up -d`. La API reinstala dependencias, ejecuta `prisma generate` y `prisma db push` antes de arrancar, y se levanta el servicio `otel-collector`.
3. Hacer algunas peticiones a la API: los spans de `neoglito-api` empiezan a llegar a PostgreSQL.
4. Desplegar un proyecto y consultar `GET /deployment/:id/telemetry/traces`, `metrics` o `logs` con un JWT.

Una instalación que ya estaba corriendo no tiene las dependencias de OpenTelemetry ni el servicio del collector hasta repetir ese `docker compose up -d`.

## Fallos frecuentes

| Síntoma | Origen y comprobación |
| --- | --- |
| No llega telemetría de la API | Falta `TELEMETRY_SYSTEM_TOKEN` o `OTEL_EXPORTER_OTLP_ENDPOINT`, o `TELEMETRY_ENABLED=false`. El SDK devuelve `null` sin avisar |
| Log del collector: `Exporting failed. Dropping data` | La API respondió 4xx, normalmente 401 por token inválido o revocado. El lote se descarta sin reintentos |
| Un despliegue no emite | Imagen de base de datos/cache/proxy (no se instrumenta a propósito), token revocado tras detener el despliegue, o el contenedor no alcanza `host.docker.internal:4318` |
| Hay spans pero no auto-instrumentados | Lenguaje no detectado con certeza: el servicio solo recibe variables. Revisar el Dockerfile final y los archivos marcadores |
| El servicio `neoglito-otel-init-*` aparece en la UI | Solo debería ocultarse con `DockerComposeRuntime.list()`; comprobar que el prefijo no se haya modificado |
| 415 en el receptor | El emisor envía protobuf directo a la API. Debe pasar por el collector, que convierte a JSON |
| 413 o error de tamaño | Lote superior a 10 MB |
| La telemetría de la API no aparece en la consulta | Es esperado: se guarda con `deploymentId` nulo y el endpoint de consulta exige un despliegue |
| Tablas que crecen demasiado | Reducir `TELEMETRY_RETENTION_DAYS` y revisar los logs `[telemetry:retention]` |

## Pruebas

Las pruebas viven junto al código (`*.spec.ts`, Vitest):

| Archivo | Cubre |
| --- | --- |
| `presentation/otlp/otlp-json-mapper.spec.ts` | Conversión OTLP JSON de las tres señales |
| `infrastructure/injection/otel-compose-injector.service.spec.ts` | Variables, precedencia, servicios omitidos, agentes, init y `depends_on` |
| `infrastructure/injection/service-runtime-detector.spec.ts` | Detección por imagen, `FROM` y archivos marcadores |
| `presentation/telemetry-ingest.guard.spec.ts` | Token válido, revocado, de sistema y ausente |
| `application/use-cases/telemetry-use-cases.spec.ts` | Ingesta, consulta y purga |
| `deployment/application/use-cases/deploy-compose.use-case.spec.ts` | Emisión y revocación del token (bloque `telemetry`) |
| `container/infrastructure/docker/docker-compose-runtime.service.spec.ts` | Los servicios init no se listan |

## Verificado y no verificado

Se comprobó de extremo a extremo en una pila Docker aislada que:

- logs, traces y metrics de la API llegan a PostgreSQL a través del collector;
- un token inválido se rechaza y el collector descarta los datos;
- la API no genera spans por recibir telemetría;
- un contenedor Node auto-instrumentado real produce spans y métricas con el `deploymentId` correcto;
- revocar el token detiene la ingesta.

**No se verificó con contenedores reales:** los agentes de Java y Python (la ruta `/autoinstrumentation-musl` de Python se asume por la estructura de la imagen), y los endpoints de consulta por HTTP con JWT (solo hay pruebas unitarias).

## Fuera de alcance

.NET y Go, OTLP/gRPC en el puerto 4317, OTLP protobuf directo a la API y la interfaz de visualización en `apps/web` con sus contratos en `packages/shared`.

Vuelve al [[Telemetry - Indice]] para el resto de la documentación.
''', ['.env.example', 'docker-compose.yml', 'src/telemetry/application/telemetry-config.ts', 'src/telemetry/infrastructure/collector/README.md', 'src/telemetry/presentation/otlp/otlp-json-mapper.spec.ts', 'src/telemetry/infrastructure/injection/otel-compose-injector.service.spec.ts', 'src/telemetry/infrastructure/injection/service-runtime-detector.spec.ts', 'src/telemetry/presentation/telemetry-ingest.guard.spec.ts', 'src/telemetry/application/use-cases/telemetry-use-cases.spec.ts', 'src/deployment/application/use-cases/deploy-compose.use-case.spec.ts', 'src/container/infrastructure/docker/docker-compose-runtime.service.spec.ts']),
}

# Enlaces a notas de otras funcionalidades (generadas por otros scripts).
external = {'Deployment - Preparacion Compose'}

for title, (body, sources) in notes.items():
    for link in re.findall(r'\[\[([^\]]+)\]\]', body):
        assert link in notes or link in external, (title, link)
    footer = '\n## Fuentes del código\n\n'
    for source in sources:
        file = repo / source
        assert file.is_file(), source
        footer += f'- [{source}]({file.as_uri()})\n'
    metadata = '---\ntags:\n  - neoglito\n  - telemetry\n  - opentelemetry\n  - documentacion-tecnica\nfuncionalidad: telemetry\nactualizado: 2026-10-11\n---\n\n'
    (out / f'{title}.md').write_text(metadata + body.strip() + '\n' + footer, encoding='utf-8')
print(f'{len(notes)} notas de telemetry; referencias internas y fuentes verificadas.')
