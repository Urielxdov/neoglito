---
tags:
  - neoglito
  - telemetry
  - opentelemetry
  - documentacion-tecnica
funcionalidad: telemetry
actualizado: 2026-10-11
---

# Telemetry · flujo

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

## Fuentes del código

- [src/telemetry/README.md](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/README.md)
- [src/deployment/application/use-cases/deploy-compose.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/deploy-compose.use-case.ts)
- [src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts)
- [src/telemetry/presentation/telemetry-ingest.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/presentation/telemetry-ingest.controller.ts)
- [src/telemetry/presentation/telemetry-ingest.guard.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/presentation/telemetry-ingest.guard.ts)
- [src/telemetry/presentation/otlp/otlp-json-mapper.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/presentation/otlp/otlp-json-mapper.ts)
- [src/telemetry/application/use-cases/ingest-telemetry.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/application/use-cases/ingest-telemetry.use-case.ts)
- [src/telemetry/infrastructure/persistence/prisma-deployment-telemetry-token.repository.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/infrastructure/persistence/prisma-deployment-telemetry-token.repository.ts)
