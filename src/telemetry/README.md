# Telemetry

Telemetría OpenTelemetry (traces, metrics y logs) de la API y de los contenedores
que neoglito despliega.

```
contenedores desplegados ─┐ OTLP/HTTP + token del deployment
API (SDK Node)           ─┴──► otel-collector :4318 ──otlphttp/JSON──► API /telemetry/ingest/v1/* ──► PostgreSQL
```

El collector es el contenedor oficial (contrib) del `docker-compose.yml`; su
configuración y las variables de entorno están en
[infrastructure/collector/README.md](infrastructure/collector/README.md).

## Capas (mismo patrón que `deployment`, `project` y `ports`)

- `domain/`: `TelemetrySpan`, `TelemetryMetricPoint`, `TelemetryLog` y value objects.
- `application/`:
  - puertos: repositorio, token por deployment e inyector;
  - casos de uso: ingesta, consulta y purga por retención;
  - `dto/otlp.ts`: subconjunto del JSON OTLP que recibe el backend.
- `infrastructure/`:
  - `otlp/`: mapper OTLP JSON → entidades.
  - `persistence/`: repositorios Prisma (spans, métricas, logs y tokens con hash SHA-256).
  - `injection/`: inyector del Compose, detector de lenguaje y catálogo de agentes.
  - `sdk/`: SDK de la propia API y `TelemetryLogger`.
  - `retention/`: purga horaria (`TELEMETRY_RETENTION_DAYS`).
  - `collector/`: configuración del collector.
- `presentation/`:
  - `POST /telemetry/ingest/v1/{traces,metrics,logs}` (solo JSON, token Bearer; fuera del envelope `ApiResponse`);
  - `GET /deployment/:id/telemetry/{traces,metrics,logs}` con JWT, filtros y cursor `before`.

## Inyector

`YamlDeploymentComposeService.prepare()` invoca a `OtelComposeInjector` antes de
aplicar las variables del usuario. Por cada servicio de aplicación añade
`OTEL_*` (endpoint, token, nombre, atributos del recurso) y `extra_hosts` hacia
el host; sin pisar lo que el Compose o el usuario ya definieron. Se omiten bases
de datos, caches, brokers y proxies (`SERVICE_IMAGE_CATALOG`).

Si el lenguaje se detecta con certeza (imagen base, `FROM` final del Dockerfile
o un único archivo marcador) se monta además el agente de auto-instrumentación
del OpenTelemetry Operator: Node, Java y Python (variante musl en Alpine). Un
servicio `neoglito-otel-init-<variante>` copia el agente a un volumen compartido;
`DockerComposeRuntime.list()` lo oculta para que no aparezca como servicio del
usuario. Con `TELEMETRY_AUTO_INSTRUMENTATION=false` solo se inyectan variables.

El token del deployment se emite en `DeployComposeUseCase`, se guarda hasheado y
se revoca al detener el deployment o si falla el arranque.

## Fuera de alcance

.NET y Go (requieren otros mecanismos), OTLP/gRPC (:4317), OTLP protobuf directo
a la API (el collector ya convierte a JSON) y la UI en `apps/web`.
