Collector independiente de OpenTelemetry. Corre como el servicio `otel-collector`
de `docker-compose.yml` (`otel/opentelemetry-collector-contrib`, versión fijada)
y publica OTLP/HTTP en el puerto **4318**. Usa la distribución *contrib* porque
`headers_setter` no está en la distribución core.

```
emisores ──OTLP/HTTP + Authorization──► collector :4318 ──otlphttp (JSON)──► API :3000/telemetry/ingest/v1/* ──► PostgreSQL
```

Emisores:

- **API de neoglito**: `startTelemetrySdk()` ([start-telemetry-sdk.ts](../sdk/start-telemetry-sdk.ts))
  envía con `TELEMETRY_SYSTEM_TOKEN` (queda con `deploymentId = null`).
- **Contenedores desplegados**: `OtelComposeInjector`
  ([otel-compose-injector.service.ts](../injection/otel-compose-injector.service.ts))
  añade al Compose de cada deployment las variables `OTEL_*` con un token propio
  del deployment y, si detecta el lenguaje, un agente de auto-instrumentación.

Cómo viaja el token: el receptor activa `include_metadata`, `headers_setter`
copia el `Authorization` entrante al exporter y el procesador `batch` agrupa por
ese header (`metadata_keys`) para no mezclar deployments. La API valida el token
en `TelemetryIngestGuard`; el collector no valida nada.

Variables (ver `.env.example`):

| Variable | Uso |
| --- | --- |
| `NEOGLITO_INGEST_URL` | Destino del exporter. En Compose: `http://api:3000/telemetry/ingest`. |
| `TELEMETRY_SYSTEM_TOKEN` | Token de la API; sin él la API no emite telemetría propia ni acepta la de sistema. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector visto desde la API (`http://otel-collector:4318`). |
| `TELEMETRY_DEPLOYMENT_COLLECTOR_ENDPOINT` | Collector visto desde los contenedores desplegados (por defecto `http://host.docker.internal:4318`). |
| `TELEMETRY_ENABLED` | `false` desactiva SDK, tokens e inyección. |
| `TELEMETRY_AUTO_INSTRUMENTATION` | `false` inyecta solo variables, sin agentes de lenguaje. |
| `TELEMETRY_RETENTION_DAYS` | Retención en PostgreSQL (por defecto 7). |
| `TELEMETRY_AUTOINSTRUMENTATION_{NODEJS,JAVA,PYTHON}_IMAGE` | Sobrescribe la imagen del agente. |

Probar a mano:

```sh
curl -X POST http://localhost:4318/v1/logs \
  -H "authorization: Bearer $TELEMETRY_SYSTEM_TOKEN" \
  -H "content-type: application/json" \
  -d '{"resourceLogs":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"demo"}}]},"scopeLogs":[{"logRecords":[{"timeUnixNano":"1700000000000000000","severityText":"INFO","body":{"stringValue":"hola"}}]}]}]}'
```
