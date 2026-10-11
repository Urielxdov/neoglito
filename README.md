# Neoglito

Neoglito es una plataforma para desplegar y observar aplicaciones compuestas por contenedores Docker. Permite conectar una cuenta de GitHub, agrupar repositorios en proyectos, analizar sus archivos Compose, configurar despliegues y consultar trazas, métricas y logs desde una interfaz web.

El proyecto nace de la necesidad de entender el código y la comunicación entre servicios cuando la generación rápida de código dificulta su trazabilidad. Su objetivo es reunir el contexto de repositorios, configuración y comportamiento de las aplicaciones en un mismo lugar.

## Funcionalidades implementadas

- Autenticación con GitHub OAuth y API protegida mediante JWT y cookies HTTP-only.
- Selección y registro de repositorios; creación, consulta y actualización de proyectos.
- Clonado de repositorios y búsqueda recursiva de archivos Docker/Compose.
- Análisis de variables de entorno y publicaciones de puertos, conservando el servicio y archivo de origen.
- Configuración de variables y puertos desde el frontend antes de desplegar.
- Despliegues Compose independientes, con construcción de imágenes, registro de contenedores y detención desde la aplicación.
- Disponibilidad de puertos mediante reservas en Redis, consulta al daemon Docker y comprobaciones TCP; restauración de reservas al arrancar la API.
- Consulta de puertos asignados a despliegues activos y bloqueo de esos campos en el formulario.
- Clasificación de servicios por imagen, protocolo, configuración, comando y referencias entre contenedores.
- Ingesta y almacenamiento de telemetría OpenTelemetry de la API y de los despliegues.
- Auto-instrumentación de aplicaciones Node.js, Java y Python cuando se puede identificar su lenguaje.
- Vista de telemetría por despliegue: detalle de trazas y spans, logs asociados y gráficas de métricas, con filtros por servicio y rango temporal.
- Refresco de telemetría cada cinco segundos en modo en vivo, pausa y consulta de datos históricos de despliegues detenidos hasta su eliminación por retención.
- Documentación de la API con Swagger y contratos TypeScript compartidos entre frontend y backend.

## Stack técnico

| Área | Tecnologías |
| --- | --- |
| Backend | NestJS, TypeScript, Node.js |
| Frontend | React 19, Vite 6, React Router, TanStack Query, Tailwind CSS |
| Persistencia | PostgreSQL 17 y Prisma |
| Caché y reservas | Redis 8 |
| Autenticación | GitHub OAuth y JWT |
| Despliegues | Docker y Docker Compose |
| Observabilidad | OpenTelemetry SDK y OpenTelemetry Collector Contrib |
| Pruebas | Vitest y Supertest |
| Lint y formato | Oxlint, ESLint y Prettier |

El frontend mantiene intencionalmente `vite@^6.3.5` y `@vitejs/plugin-react@^4.3.4`. El transform de Babel conserva la metadata que React DevTools necesita para mostrar **rendered by** y **source**. React Compiler se integra mediante la opción `babel` del plugin React en [apps/web/vite.config.ts](apps/web/vite.config.ts). No actualizar a Vite 8/plugin React 6 sin verificar primero que ese problema esté resuelto; ver [AGENTS.md](AGENTS.md).

## Arquitectura

El repositorio es un monorepo con npm workspaces. Los módulos de dominio del backend separan entidades, casos de uso, puertos, infraestructura y controladores.

```text
.
|-- apps/web/             # Frontend: repositorios, proyectos, análisis y telemetría
|-- packages/shared/      # Contratos TypeScript compartidos
|-- prisma/               # Schema, modelos y migraciones
|-- src/
|   |-- auth/             # GitHub OAuth y JWT
|   |-- repository/       # Registro y clonado de repositorios
|   |-- project/          # Gestión de proyectos
|   |-- analisys/         # Contexto y análisis de archivos del proyecto
|   |-- deployment/       # Preparación y seguimiento de despliegues
|   |-- container/        # Integración con Docker
|   |-- ports/            # Reservas, sondas y clasificación
|   |-- startup/          # Caché de puertos y restauración de reservas
|   |-- telemetry/        # SDK, collector, ingesta, consultas e instrumentación
|   `-- shared/           # Infraestructura y utilidades compartidas
|-- test/                 # Pruebas e2e
|-- docker-compose.yml    # API, frontend, PostgreSQL, Redis y collector
`-- Dockerfile
```

La telemetría sigue este recorrido:

```text
API (SDK Node) -----------+
                         +--> Collector :4318 --> API /telemetry/ingest/v1/* --> PostgreSQL
Contenedores desplegados-+       OTLP/HTTP              OTLP JSON
```

## Requisitos

- Docker con el daemon en ejecución y Docker Compose v2.
- Una OAuth App de GitHub.
- Para ejecutar herramientas o servicios fuera de Docker: Node.js 22 y npm.

La API necesita acceso al daemon y a la CLI de Docker para desplegar e inspeccionar contenedores. El Compose de desarrollo monta `/var/run/docker.sock` y el Dockerfile incluye Git y las herramientas de Docker.

## Configuración de GitHub OAuth

Crea una **OAuth App** en GitHub Developer Settings con estos valores para desarrollo local:

```text
Homepage URL: http://localhost:5174
Authorization callback URL: http://localhost:3000/auth/github/callback
```

Copia el `Client ID` y genera un `Client Secret` para completar `.env`.

## Variables de entorno

Copia [.env.example](.env.example) a `.env`:

```bash
cp .env.example .env
```

En PowerShell:

```powershell
Copy-Item .env.example .env
```

Configura las credenciales de GitHub, `JWT_SECRET`, `ENCRYPTION_SECRET_KEY` y `TELEMETRY_SYSTEM_TOKEN`. Puedes generar una clave de 32 bytes en Base64 con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Usa una clave distinta para cada secreto. `ENCRYPTION_SECRET_KEY` requiere exactamente 32 bytes codificados en Base64.

| Variable | Uso y valor local |
| --- | --- |
| `DATABASE_URL` | Fuera de Docker: `postgresql://postgres:postgres@localhost:5432/neoglito`; Compose configura el host `postgres` para la API. |
| `REDIS_URL` | Fuera de Docker: `redis://localhost:6379`; Compose usa `redis://redis:6379` por defecto. |
| `ENCRYPTION_SECRET_KEY` | Clave para cifrar credenciales almacenadas. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Credenciales de la OAuth App. |
| `BACKEND_URL` | `http://localhost:3000`. |
| `GITHUB_CALLBACK_URL` | `http://localhost:3000/auth/github/callback`. |
| `JWT_SECRET` | Clave para firmar JWT. |
| `FRONTEND_URL` | Origen permitido: `http://localhost:5174`. |
| `VITE_API_URL` | API desde el navegador: `http://localhost:3000`. |
| `CONTAINER_PROBE_HOST` | Host para comprobar puertos publicados. Compose usa `host.docker.internal`; la ejecución nativa usa `127.0.0.1` por defecto. |
| `DEPLOYMENT_COMPOSE_DIRECTORY` | Directorio de Compose generados; por defecto `.neoglito/deployments`. |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Mantener en `1`; `0` se reserva para desarrollo local detrás de un proxy que inspecciona TLS. |

Variables de telemetría:

| Variable | Uso |
| --- | --- |
| `TELEMETRY_SYSTEM_TOKEN` | Token de telemetría propia de la API; sin él no emite telemetría de sistema. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector visto desde la API. En Docker: `http://otel-collector:4318`; con la API nativa: `http://localhost:4318`. |
| `TELEMETRY_DEPLOYMENT_COLLECTOR_ENDPOINT` | Collector visto desde los contenedores desplegados: `http://host.docker.internal:4318`. |
| `NEOGLITO_INGEST_URL` | Destino del collector: `http://api:3000/telemetry/ingest`; con la API nativa: `http://host.docker.internal:3000/telemetry/ingest`. |
| `TELEMETRY_ENABLED` | `false` desactiva SDK, emisión de tokens e inyección; por defecto `true`. |
| `TELEMETRY_AUTO_INSTRUMENTATION` | `false` inyecta únicamente variables OTEL, sin agentes; por defecto `true`. |
| `TELEMETRY_RETENTION_DAYS` | Retención en PostgreSQL; por defecto siete días, con purga horaria. |

**Para ejecutar todo con Docker Compose**, cambia en `.env` el endpoint del ejemplo a:

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

El ejemplo usa `localhost:4318`, apropiado para una API nativa. Dentro del contenedor de la API, `localhost` apunta a ese mismo contenedor y no al collector.

## Ejecución con Docker Compose

Desde la raíz:

```bash
docker compose up --build
```

| Servicio | Dirección |
| --- | --- |
| Frontend | http://localhost:5174 |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/docs |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| Collector OTLP/HTTP | `localhost:4318` |

La API espera a que PostgreSQL y Redis estén saludables, instala dependencias con `npm ci`, genera Prisma Client, sincroniza el schema con `prisma db push` y arranca en modo desarrollo. El frontend también instala dependencias antes de iniciar Vite. PostgreSQL conserva sus datos en el volumen `postgres_data`.

Si cambias dependencias mientras los servicios están corriendo, reinícialos para instalarlas:

```bash
docker compose restart api frontend
```

Para revisar logs o detener la plataforma:

```bash
docker compose logs -f api otel-collector
docker compose down
```

Los proyectos desplegados usan sus propios nombres Compose. Detén esos despliegues desde Neoglito antes de apagar la plataforma si también quieres detener sus contenedores.

## Flujo de uso

1. Inicia sesión con GitHub y selecciona los repositorios que quieres registrar.
2. Crea un proyecto y asocia los repositorios relacionados.
3. Abre la configuración del proyecto para clonar y descubrir sus archivos Compose.
4. Selecciona el Compose y ajusta variables de entorno y puertos. Los puertos asignados a despliegues activos aparecen bloqueados.
5. Ejecuta el despliegue y consulta sus contenedores y clasificación en la vista de análisis.
6. Abre la telemetría para explorar trazas, métricas y logs; filtra por servicio o rango temporal y activa o pausa el refresco.
7. Detén el despliegue desde la aplicación cuando termines. La telemetría almacenada permanece hasta cumplir su retención.

## Despliegues y puertos

Cada despliegue genera su propio YAML en `.neoglito/deployments/.neoglito-<deploymentId>.compose.yml` y usa el nombre Compose `neoglito-<deploymentId>`. Se conserva el directorio original para resolver builds, volúmenes y archivos de entorno. Los archivos generados pueden contener credenciales y están excluidos de Git y del contexto de construcción.

El frontend envía `mirrorPorts: true`: el puerto elegido se utiliza como puerto publicado y como listener interno. El preparador ajusta servicios compatibles, healthchecks y URLs internas; si no reconoce cómo cambiar el listener, rechaza el despliegue con un mensaje para configurarlo. Los clientes que omiten esta opción mantienen el mapeo host/contenedor original.

La disponibilidad combina reservas de Redis, publicaciones reales de Docker y sondas TCP. Al arrancar, la API reconstruye la caché de declaraciones Compose y restaura las reservas de despliegues. La clasificación puede devolver `UNKNOWN` cuando no hay evidencia suficiente; también admite servicios sin puertos publicados.

## Telemetría

El collector recibe OTLP/HTTP y lo reenvía como JSON al backend, que guarda spans, puntos de métricas y logs en PostgreSQL. Cada despliegue tiene un token propio almacenado como hash SHA-256; se revoca al detenerlo o cuando falla su arranque. La telemetría de la API utiliza el token de sistema y se almacena sin asociación a un despliegue.

El inyector añade variables `OTEL_*` y, cuando detecta Node.js, Java o Python, monta un agente mediante servicios auxiliares `neoglito-otel-init-*`. Estos servicios se ocultan de la lista de contenedores del usuario. Las variables del usuario prevalecen sobre las inyectadas. Bases de datos, cachés, brokers y proxies del catálogo no reciben esos agentes.

La instrumentación depende del runtime detectado y de las librerías compatibles con el agente. El flujo actual usa OTLP/HTTP en el puerto 4318; no incluye OTLP/gRPC ni auto-instrumentación de Go o .NET. La API de ingesta recibe JSON; el collector convierte los datos antes de reenviarlos.

## Scripts disponibles

Desde la raíz:

```bash
npm ci
npm run start:dev         # Backend en desarrollo; requiere Docker, PostgreSQL y Redis
npm run build             # Compila el backend
npm run test              # Pruebas con Vitest
npm run test:watch         # Pruebas en modo watch
npm run test:e2e           # Pruebas end-to-end
npm run test:cov           # Cobertura
npm run lint              # Lint del backend
npm run prisma:generate   # Genera Prisma Client
npm run prisma:migrate    # Migraciones en desarrollo
npm run prisma:deploy     # Aplica migraciones existentes
npm run prisma:studio     # Abre Prisma Studio
```

Frontend:

```bash
npm --workspace @neoglito/web run dev
npm --workspace @neoglito/web run build
npm --workspace @neoglito/web run lint
npm --workspace @neoglito/web run preview
```

## Endpoints principales

Consulta los contratos y parámetros completos en Swagger (`/docs`). Las rutas de proyectos, repositorios, despliegues, puertos y consulta de telemetría requieren JWT.

| Método y ruta | Función |
| --- | --- |
| `GET /auth/github` | Iniciar OAuth con GitHub. |
| `GET /auth/github/callback` | Recibir el callback OAuth. |
| `GET /auth/me` | Consultar el usuario autenticado. |
| `GET /repository/all` | Listar repositorios del usuario. |
| `POST /repository/registry` | Registrar un repositorio. |
| `POST /repository/clone` | Clonar un repositorio. |
| `GET /project` | Listar proyectos. |
| `POST /project/registry` | Crear un proyecto. |
| `POST /project/:id/update` | Actualizar un proyecto. |
| `POST /project/init` | Clonar y analizar Compose y variables. |
| `POST /deployment/docker_files` | Descubrir archivos Compose, variables y puertos. |
| `POST /deployment` | Configurar y ejecutar un despliegue. |
| `GET /deployment/project/:projectId` | Listar despliegues del proyecto. |
| `GET /deployment/:deploymentId/ports` | Consultar puertos asignados. |
| `POST /deployment/:deploymentId/classify` | Clasificar servicios. |
| `POST /deployment/:deploymentId/stop` | Detener un despliegue. |
| `GET /port` | Consultar reservas y puertos publicados en Docker. |
| `POST /port` | Reservar un puerto para la configuración de un proyecto. |
| `DELETE /port/:projectId/:port` | Liberar una reserva provisional. |
| `GET /deployment/:deploymentId/telemetry/traces` | Consultar spans. |
| `GET /deployment/:deploymentId/telemetry/metrics` | Consultar puntos de métricas. |
| `GET /deployment/:deploymentId/telemetry/logs` | Consultar logs. |
| `POST /telemetry/ingest/v1/traces` | Recibir trazas OTLP JSON. |
| `POST /telemetry/ingest/v1/metrics` | Recibir métricas OTLP JSON. |
| `POST /telemetry/ingest/v1/logs` | Recibir logs OTLP JSON. |

Las consultas de telemetría admiten filtros y paginación con cursor `before`. Las rutas de ingesta usan un token Bearer de sistema o despliegue y responden fuera del envelope habitual `ApiResponse`.

## Modelo de datos

- `User` y `GitHubConnection`: identidad y vinculación con GitHub.
- `Project` y `Repository`: agrupación de repositorios.
- `Deployment` y `DeploymentService`: estado del despliegue y sus contenedores, clasificación y puerto registrado.
- `DeploymentTelemetryToken`: autenticación de emisores por despliegue.
- `TelemetrySpan`, `TelemetryMetricPoint` y `TelemetryLog`: señales de observabilidad persistidas.

## Documentación adicional

- [Preparación y aislamiento de Compose](src/deployment/infrastructure/compose/README.md).
- [Disponibilidad y reservas de puertos](src/ports/README.md).
- [Clasificación de contenedores](src/ports/infrastructure/classification/README.md).
- [Inicialización y caché de puertos](src/startup/README.md).
- [Backend de telemetría](src/telemetry/README.md).
- [Collector y configuración de OpenTelemetry](src/telemetry/infrastructure/collector/README.md).

## Próximos pasos

- Visualización gráfica de comunicación y dependencias entre servicios.
- Centralización de documentación por endpoint.
- Ampliación de la detección de dependencias y de la cobertura de instrumentación.

## Licencia

Este proyecto está marcado como `UNLICENSED` en `package.json`.

## Nota

El proyecto se desarrolla también con fines de aprendizaje, por lo que algunos archivos contienen comentarios pedagógicos.
