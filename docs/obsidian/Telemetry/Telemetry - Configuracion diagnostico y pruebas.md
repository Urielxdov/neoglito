---
tags:
  - neoglito
  - telemetry
  - opentelemetry
  - documentacion-tecnica
funcionalidad: telemetry
actualizado: 2026-10-11
---

# Telemetry · configuración, diagnóstico y pruebas

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

## Fuentes del código

- [.env.example](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/.env.example)
- [docker-compose.yml](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/docker-compose.yml)
- [src/telemetry/application/telemetry-config.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/application/telemetry-config.ts)
- [src/telemetry/infrastructure/collector/README.md](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/infrastructure/collector/README.md)
- [src/telemetry/presentation/otlp/otlp-json-mapper.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/presentation/otlp/otlp-json-mapper.spec.ts)
- [src/telemetry/infrastructure/injection/otel-compose-injector.service.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/infrastructure/injection/otel-compose-injector.service.spec.ts)
- [src/telemetry/infrastructure/injection/service-runtime-detector.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/infrastructure/injection/service-runtime-detector.spec.ts)
- [src/telemetry/presentation/telemetry-ingest.guard.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/presentation/telemetry-ingest.guard.spec.ts)
- [src/telemetry/application/use-cases/telemetry-use-cases.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/application/use-cases/telemetry-use-cases.spec.ts)
- [src/deployment/application/use-cases/deploy-compose.use-case.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/deploy-compose.use-case.spec.ts)
- [src/container/infrastructure/docker/docker-compose-runtime.service.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/infrastructure/docker/docker-compose-runtime.service.spec.ts)
