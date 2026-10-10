from pathlib import Path
import re

root = Path(__file__).resolve().parent
repo = root.parent.parent
notes = {
'00 - Inicio': '''# Neoglito · documentación del proyecto

Esta documentación describe el código revisado el **10 de octubre de 2026**. Es una fotografía del repositorio, no una garantía de que el entorno esté ejecutándose. Se basa en código, contratos, modelos y configuración; no se ejecutaron despliegues ni pruebas de la aplicación para redactarla.

## Mapa de navegación

- [[01 - Vision y flujo de uso]]: propósito y recorrido del usuario.
- [[02 - Arquitectura]]: módulos, capas y dependencias.
- [[03 - Instalacion y configuracion]]: levantar el entorno.
- [[04 - Autenticacion]]: OAuth, JWT y cifrado.
- [[05 - API y contratos]]: rutas actuales y protección.
- [[06 - Modelo de datos]]: entidades y relaciones.
- [[07 - Repositorios y analisis Compose]]: clonado y extracción.
- [[08 - Despliegues Docker]]: preparación, ejecución y detención.
- [[09 - Puertos y clasificacion]]: reservas e identificación de servicios.
- [[10 - Frontend]]: navegación, estado y llamadas HTTP.
- [[11 - Desarrollo y pruebas]]: comandos y mapa de pruebas.
- [[12 - Diagnostico y limites]]: problemas frecuentes y límites del código.

## Cómo utilizar la bóveda

Abre esta nota como punto de entrada. Los enlaces entre notas permiten recorrer el tema y consultar los backlinks; los diagramas Mermaid se muestran en vista de lectura. No se requieren plugins comunitarios. Cada nota incluye fuentes del repositorio original. Si mueves el código a otra carpeta, actualiza esos enlaces.

La bóveda contiene documentación, no copias de `.env`, tokens ni repositorios clonados. Las notas anteriores y la configuración de Obsidian se conservan.
''',
'01 - Vision y flujo de uso': '''# Visión y flujo de uso

Neoglito reúne repositorios de GitHub en proyectos, encuentra archivos Docker Compose, permite configurar y ejecutar despliegues y clasifica sus contenedores. Su visión es facilitar la comprensión de sistemas distribuidos; la visualización completa de relaciones entre servicios sigue pendiente.

## Recorrido principal

1. Autenticarse con GitHub: [[04 - Autenticacion]].
2. Consultar y seleccionar repositorios de GitHub.
3. Crear un proyecto y registrar los repositorios asociados.
4. Inicializar el proyecto o buscar Compose: [[07 - Repositorios y analisis Compose]].
5. Elegir un archivo, configurar variables y puertos.
6. Lanzar un despliegue: [[08 - Despliegues Docker]].
7. Consultar puertos y clasificar los contenedores: [[09 - Puertos y clasificacion]].
8. Detener el despliegue cuando sea necesario.

El repositorio es un monorepo privado con licencia declarada `UNLICENSED`. PostgreSQL almacena entidades; Redis mantiene caché y reservas; Docker ejecuta los contenedores. Consulta [[12 - Diagnostico y limites]] para distinguir lo implementado de lo previsto.
''',
'02 - Arquitectura': '''# Arquitectura

El backend usa NestJS y TypeScript con separación entre presentación, aplicación, dominio e infraestructura. Las interfaces o puertos permiten conectar casos de uso con adaptadores de Prisma, Git, YAML, Redis y Docker. Esta estructura se aplica con distintos grados de separación: algunos servicios de aplicación utilizan Prisma directamente.

```mermaid
flowchart LR
    Web[React y Vite] --> API[NestJS]
    API --> Auth[GitHub OAuth]
    API --> DB[(PostgreSQL y Prisma)]
    API --> Redis[(Redis)]
    API --> Git[Git y archivos locales]
    API --> Docker[Docker Compose del host]
    Contracts[Contratos compartidos] --- Web
    Contracts --- API
```

| Carpeta | Responsabilidad |
| --- | --- |
| `src/auth` | OAuth, JWT y vinculación GitHub |
| `src/project` | Crear, listar y editar proyectos |
| `src/repository` | Registro, listado GitHub y clonado |
| `src/analisys` | Análisis de proyectos; la carpeta conserva esta grafía |
| `src/deployment` | Preparación Compose y casos de uso de despliegue |
| `src/container` | Abstracción y adaptador del runtime Docker |
| `src/ports` | Reservas, sondas y clasificación |
| `src/shared` | Infraestructura y respuesta HTTP comunes |
| `src/startup` | Restauración de reservas al iniciar |
| `apps/web` | Interfaz React |
| `packages/shared` | Contratos TypeScript reutilizables |
| `prisma` | Schema dividido en modelos y migraciones |

`AppModule` conecta los módulos principales. `main.ts` carga `.env`, comprueba Docker, instala filtro e interceptor globales, habilita CORS con credenciales y expone Swagger en `/docs`.

Relacionadas: [[05 - API y contratos]], [[06 - Modelo de datos]], [[10 - Frontend]].
''',
'03 - Instalacion y configuracion': '''# Instalación y configuración

## Entorno con Docker Compose

Necesitas Docker con Compose y una OAuth App de GitHub. Ejecuta los comandos desde la raíz del repositorio original, no desde la bóveda.

```powershell
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Coloca la clave generada en `ENCRYPTION_SECRET_KEY` y completa `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` y `JWT_SECRET` en `.env`. Configura la OAuth App con homepage `http://localhost:5174` y callback `http://localhost:3000/auth/github/callback`.

```powershell
docker compose up --build
```

| Servicio | Dirección local |
| --- | --- |
| Frontend | http://localhost:5174 |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

La API ejecuta `npm ci --include=dev`, `prisma generate`, `prisma db push` y el servidor en modo watch. El frontend instala dependencias e inicia Vite. API espera los healthchecks de PostgreSQL y Redis. El contenedor API instala Git y Docker CLI y monta el socket Docker del host.

> [!note] Base de datos
> El Compose actual usa `db push` para sincronizar el esquema. No ejecuta `migrate deploy`. PostgreSQL conserva datos en `postgres_data`; Redis no tiene volumen persistente en este Compose.

## Variables de configuración

| Variable | Uso / valor de desarrollo |
| --- | --- |
| `DATABASE_URL` | PostgreSQL; dentro del Compose el host es `postgres` |
| `REDIS_URL` | Default local `redis://localhost:6379`; Compose usa `redis` |
| `ENCRYPTION_SECRET_KEY` | Clave de 32 bytes codificada en Base64 |
| `JWT_SECRET` | Firma y validación de sesión |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | OAuth App |
| `BACKEND_URL`, `GITHUB_CALLBACK_URL` | Construcción/configuración del callback |
| `FRONTEND_URL` | Origen CORS y redirección; default puerto 5174 |
| `VITE_API_URL` | URL del backend utilizada por el frontend |
| `PORT` | Puerto HTTP del backend; default 3000 |
| `CONTAINER_PROBE_HOST` | Host de sondas; Compose usa `host.docker.internal` |
| `DEPLOYMENT_COMPOSE_DIRECTORY` | Ubicación opcional de YAML generados |
| `NODE_TLS_REJECT_UNAUTHORIZED` | El ejemplo establece `1` |

Para instalar dependencias nuevas en los servicios existentes: `docker compose restart api frontend`. Para ejecución fuera de Docker necesitas Node/npm, Git, Docker operativo, PostgreSQL y Redis accesibles; consulta [[11 - Desarrollo y pruebas]].

> [!note] Configuración Prisma observada
> El archivo se llama `prisma7.config.ts` y apunta a la carpeta `prisma`. Los scripts invocan `prisma` sin `--config`. Si el CLI no descubre el archivo, usa explícitamente `npx prisma generate --config prisma7.config.ts` y revisa los comandos equivalentes. El arranque no se verificó en esta revisión.
''',
'04 - Autenticacion': '''# Autenticación

```mermaid
sequenceDiagram
    participant U as Navegador
    participant A as API
    participant G as GitHub
    participant P as PostgreSQL
    U->>A: GET /auth/github
    A-->>U: Redirección OAuth
    U->>G: Autorizar cuenta
    G-->>U: Callback con code
    U->>A: GET /auth/github/callback?code=...
    A->>G: Intercambiar code y consultar perfil
    A->>P: Guardar usuario y conexión
    A-->>U: Cookie access_token y redirección al frontend
    U->>A: GET /auth/me con cookie
    A-->>U: Usuario autenticado
```

El inicio OAuth solicita `read:user user:email`. El callback obtiene el token y perfil de GitHub y emite un JWT para la aplicación. La cookie `access_token` es HttpOnly, SameSite `lax`, dura una hora y activa `secure` cuando `NODE_ENV` es `production`.

`JwtStrategy` acepta la cookie o `Authorization: Bearer <token>` y verifica expiración. Devuelve el usuario como `{ id, username }`. El cliente web usa `credentials: 'include'`; el backend permite credenciales para `FRONTEND_URL`.

Los tokens GitHub se cifran mediante AES-256-GCM con clave de 32 bytes, IV aleatorio y etiqueta de autenticación. El formato almacenado incluye versión `v1`. El clonado descifra el token cuando debe acceder al repositorio.

No todos los endpoints tienen guard: consulta la tabla de [[05 - API y contratos]]. Además, el modelo actual no relaciona proyectos con usuarios; consulta [[06 - Modelo de datos]].
''',
'05 - API y contratos': '''# API y contratos

Swagger está disponible en `http://localhost:3000/docs` cuando la API arranca. La tabla refleja los decoradores del código, incluidos los endpoints que actualmente no tienen `JwtAuthGuard`.

| Método | Ruta | JWT | Función |
| --- | --- | --- | --- |
| GET | `/auth/github` | No | Inicia OAuth |
| GET | `/auth/github/callback` | No | Procesa code y crea sesión |
| GET | `/auth/me` | Sí | Usuario autenticado |
| GET | `/repository/all` | Sí | Repositorios GitHub del usuario |
| POST | `/repository/registry` | No | Vincula repositorio y proyecto |
| POST | `/repository/clone` | Sí | Clona o reutiliza carpeta |
| GET | `/project` | Sí | Lista proyectos |
| POST | `/project/registry` | No | Crea proyecto |
| POST | `/project/:id/update` | Sí | Edita nombre y descripción |
| POST | `/project/init` | Sí | Clona y analiza variables, sin puertos |
| POST | `/deployment/docker_files` | Sí | Busca Compose y extrae variables/puertos |
| POST | `/deployment` | Sí | Despliega un Compose |
| GET | `/deployment/project/:projectId` | Sí | Despliegues del proyecto |
| GET | `/deployment/:deploymentId/ports` | Sí | Asignaciones guardadas |
| POST | `/deployment/:deploymentId/stop` | Sí | Detiene despliegue |
| POST | `/deployment/:deploymentId/classify` | Sí | Clasifica servicios |
| GET | `/port` | No | Reservas existentes |
| POST | `/port` | Sí | Reserva provisional |
| DELETE | `/port/:projectId/:port` | Sí | Libera reserva provisional |

> [!note] Diferencias con README y Swagger
> La ruta actual de búsqueda es `/deployment/docker_files`; el README menciona `/project/docker_files`. Los decoradores Swagger describen algunos POST como HTTP 200, pero no fijan el código real con `@HttpCode`; Nest normalmente responde 201 a POST. Conviene comprobar la respuesta real al integrar clientes.

## Respuesta común

```json
{"success": true, "data": {}, "error": null, "meta": null}
```

Los errores usan `success: false`, `data: null` y `error` con `code`, `message` y, cuando corresponde, `details`. Las redirecciones OAuth quedan fuera del envoltorio. Las fechas serializadas se describen mediante contratos compartidos.

## Cuerpos habituales

Crear proyecto: `{ "name": "demo", "description": "Proyecto de ejemplo" }`.

Analizar archivos: `{ "projectId": 1 }` para `/deployment/docker_files`.

Reserva provisional: `{ "projectId": 1, "port": 3002 }` para `/port`.

El contrato `DeployComposeRequest` requiere `projectId` y `composePath`; admite `environment`, `ports` y `mirrorPorts`. Usa una ruta devuelta por el análisis. Cada variable tiene `key`, `value` y `service` opcional. Cada puerto tiene `service`, `hostIp`, `publishedPort`, `targetPort`, `protocol` y `mappingType`.

Consulta [[08 - Despliegues Docker]] antes de configurar `mirrorPorts`. Los contratos están en `packages/shared/src`, y las clases DTO en las carpetas de aplicación del backend.
''',
'06 - Modelo de datos': '''# Modelo de datos

Prisma usa PostgreSQL. `schema.prisma` declara generador y proveedor; los modelos reales se encuentran en `prisma/models`. `PrismaService` utiliza `PrismaPg` y exige `DATABASE_URL`.

```mermaid
erDiagram
    User ||--o| GitHubConnection : vincula
    Project }o--o{ Repository : agrupa
    Project ||--o{ Deployment : registra
    Deployment ||--o{ DeploymentService : contiene
```

| Modelo | Campos y restricciones relevantes |
| --- | --- |
| `User` | id incremental, name, createdAt |
| `GitHubConnection` | userId único, githubId único, username, avatarUrl, tokens y vencimientos opcionales |
| `Project` | id incremental, name único, description, createdAt, updatedAt |
| `Repository` | id externo entero, name, gitUrl, cloneUrl único; relación muchos a muchos con proyectos |
| `Deployment` | UUID, projectId, composePath, status, createdAt, startedAt, finishedAt |
| `DeploymentService` | id de contenedor, composeServiceName, port, status, health, serviceType, lastObservedAt |

Eliminar un usuario elimina su conexión GitHub; eliminar un proyecto elimina sus despliegues; eliminar un despliegue elimina sus servicios mediante cascadas declaradas.

## Enumeraciones

- DeploymentStatus: `pending`, `building`, `starting`, `running`, `failed`, `stopping`, `stopped`.
- ContainerStatus: `created`, `running`, `paused`, `restarting`, `exited`, `dead`.
- ContainerHealth: `starting`, `healthy`, `unhealthy`, `none`.
- ServiceType: `BACKEND`, `FRONTEND`, `DATABASE`, `CACHE`, `MESSAGE_BROKER`, `WORKER`, `SCHEDULER`, `REVERSE_PROXY`, `UNKNOWN`.

`DeploymentService.port` almacena un entero por servicio. El valor `0` representa ausencia de publicación; el endpoint de puertos puede responder `null` cuando no hay asignación activa. No almacena todas las publicaciones posibles ni evidencia de clasificación.

> [!note] Alcance de usuarios
> `Project` no tiene userId ni relación con User. `PrismaProjectRepository.findAll()` lista todos los proyectos. Un guard JWT exige una sesión, pero no proporciona por sí mismo aislamiento de proyectos por usuario.

Relacionadas: [[04 - Autenticacion]], [[08 - Despliegues Docker]], [[09 - Puertos y clasificacion]].
''',
'07 - Repositorios y analisis Compose': '''# Repositorios y análisis Compose

`CloneRepositoryUseCase` busca la conexión GitHub del usuario, valida una URL HTTPS de `github.com`, obtiene el nombre y clona en `repo/<username>/<repositoryName>`. Si el destino ya existe, lo devuelve directamente: este flujo no realiza un pull para actualizarlo.

`ProjectAnalysisService` carga el proyecto con sus repositorios, los clona en paralelo y busca archivos recursivamente. Después analiza variables y, cuando se solicita, puertos. Un proyecto inexistente produce NotFound.

## Dos operaciones de análisis

- `/project/init` devuelve `clonedRepositoryPaths`, `dockerComposePaths` y variables por Compose; llama al análisis con `includePorts: false`.
- `/deployment/docker_files` devuelve `clonedRepositoryPaths`, `dockerFilesPath` y `composeAnalyses` con variables y puertos.

El puerto incluye servicio, IP host, puerto publicado, puerto interno, protocolo y tipo de mapeo. La extracción de variables y puertos utiliza adaptadores YAML separados.

> [!note] Nombres detectados por el flujo actual
> `ProjectAnalysisService` usa `/(^|\\/)docker-compose.*\\.yml$/`. Por tanto, no debe asumirse que descubre `compose.yaml`, `compose.yml`, `docker-compose.yaml` o Dockerfiles. Existe otro caso de uso, `FindDockerFilesUseCase`, con patrones más amplios, pero el flujo revisado de análisis usa el buscador anterior.

Las rutas encontradas se utilizan para seleccionar un archivo autorizado al desplegar. Consulta [[08 - Despliegues Docker]] y [[12 - Diagnostico y limites]].
''',
'08 - Despliegues Docker': '''# Despliegues Docker

`POST /deployment` recibe proyecto, ruta Compose y configuración opcional. El caso de uso valida que el archivo corresponda al proyecto, prepara un YAML independiente, reserva puertos TCP y utiliza el runtime Docker para construir/iniciar y observar contenedores.

## Archivo generado

`YamlDeploymentComposeService` modifica variables y publicaciones del Compose seleccionado y escribe `.neoglito/deployments/.neoglito-<deploymentId>.compose.yml`. `DEPLOYMENT_COMPOSE_DIRECTORY` permite cambiar el destino. El archivo puede contener credenciales y el directorio está excluido de Git y del contexto de build.

Una variable sin `service` se aplica a todos los servicios del archivo. Los valores se escriben como literales, incluidos los signos `$`.

Cada despliegue usa `neoglito-<deploymentId>` como nombre de proyecto y ejecuta Compose con `-p`, `--project-directory` y `-f`. Ajusta nombres explícitos de contenedores y recursos propios. Las referencias de recursos externos y bind mounts se conservan.

`x-neoglito.projectDirectory` conserva la carpeta original para resolver builds, archivos de entorno y otras rutas. `x-neoglito.sourceComposePath` permite asociar el despliegue con el archivo original. `Deployment.composePath` guarda la ruta configurada y se reutiliza al detener y clasificar.

## Puertos y listeners

El frontend envía `mirrorPorts: true`: el número elegido se aplica al puerto publicado y al listener interno. El preparador ajusta `PORT`, parámetros conocidos de Vite/Redis/PostgreSQL, healthchecks y URLs internas. Si no reconoce cómo cambiar el listener, rechaza la configuración con un mensaje. Si se omite `mirrorPorts`, se conserva el mapeo host/contenedor original.

Un puerto host vacío permite asignación por Docker. Los rangos reservan cada puerto; datos inválidos o repetidos fallan antes de ejecutar Docker. Ante un arranque parcial fallido se intenta detener el proyecto creado.

## Operación posterior

Consulta despliegues con `GET /deployment/project/:projectId`. `POST /deployment/:deploymentId/stop` ejecuta Compose down y actualiza estados. La clasificación es una operación explícita descrita en [[09 - Puertos y clasificacion]].

Cuando la API está dentro de Docker, las rutas de bind mounts se traducen a rutas del host del daemon a partir de los mounts de la API. Esto importa porque Docker usa el sistema de archivos del host, aunque el cliente Compose se ejecute en `/app`.
''',
'09 - Puertos y clasificacion': '''# Puertos y clasificación

## Reservas Redis

`POST /port` valida puertos enteros de 1 a 65535 y crea una reserva provisional con propietario `draft:<projectId>:port:<port>`. Su TTL es **300 segundos**. Si está reservado o en uso, devuelve conflicto. `DELETE /port/:projectId/:port` libera únicamente la reserva provisional correspondiente.

Al desplegar, la reserva provisional pasa a propietarios del despliegue; los contenedores tienen sus reservas asociadas. `GET /port` devuelve un mapa de claves de propietario a claves de puerto; no devuelve una lista de todos los puertos libres del sistema.

En el arranque, `RestoreDeploymentPortReservationsService` consulta servicios persistidos `running`, `paused` o `restarting` con puerto mayor a cero y restaura las reservas en Redis. Si detecta conflictos, falla el bootstrap con un error.

`GET /deployment/:deploymentId/ports` lee asignaciones persistidas sin ejecutar Docker ni reservar puertos. Los despliegues detenidos/fallidos o servicios sin publicación devuelven `null`. La interfaz bloquea campos ya asignados; si la consulta falla ofrece reintentar.

## Clasificación de servicios

`POST /deployment/:deploymentId/classify` observa e inspecciona contenedores. Todos los servicios registrados deben seguir en `running`; no es obligatorio que publiquen puertos.

```mermaid
flowchart TD
    I[Imagen y catálogo] --> P[Protocolo y sondas]
    P --> H[Huellas HTTP]
    H --> W[Configuración de servidor web]
    W --> R[Referencias de otros contenedores]
    R --> C[Comando]
    C --> T[Resultado y persistencia]
```

La cadena puede resolver antes de llegar al final. Los handlers pasan, acotan candidatos, resuelven o señalan conflicto. Los discriminadores solo se aplican cuando admiten todos los candidatos restantes.

Las sondas TCP/HTTP consultan puertos publicados usando `CONTAINER_PROBE_HOST`; la configuración se obtiene mediante Docker exec. Las referencias, aliases y variables ayudan a distinguir Redis como caché o broker. Comandos de tareas permiten distinguir worker y scheduler.

Un resultado `resolved` guarda su tipo; `ambiguous`, `conflict` y `unknown` guardan `UNKNOWN`. Candidatos y evidencia no se persisten. Un servicio sin puertos puede clasificarse por imagen, configuración, uso o comando.

Relacionadas: [[06 - Modelo de datos]], [[08 - Despliegues Docker]], [[12 - Diagnostico y limites]].
''',
'10 - Frontend': '''# Frontend

`apps/web` usa React 19, Vite, TypeScript, React Router, Zod y Tailwind mediante el plugin de Vite. El servidor escucha en 5174 con `strictPort: true`.

## Navegación

`app.tsx` declara `/authentication`, la ruta raíz protegida con `RepositorySelectionPage` y una redirección para rutas desconocidas. Las vistas de proyectos, detalle y análisis se organizan mediante contenedores y componentes; no todas son rutas de URL independientes.

| Área | Código principal |
| --- | --- |
| Sesión GitHub | `features/auth` |
| Selección de repositorios | `features/repositories` |
| Crear, editar y abrir proyectos | `features/projects/hooks` |
| Lista y detalle de proyectos | `features/projects/components/list` y `detail` |
| Configurar despliegue | `features/projects/components/deploy` |
| Explorar análisis | `features/projects/components/analyze` |
| Reservas | `features/ports` |
| Estado | Contextos y reducers de auth, repositories, projects, deploys y analysis |

Los servicios HTTP se encargan de llamadas; los mappers transforman contratos a modelos de UI; los hooks coordinan interacciones. `packages/shared` mantiene los contratos utilizados por ambos lados.

`apiClient` utiliza `VITE_API_URL`, añade `credentials: 'include'` y exige el envoltorio `success/data/error/meta`. Convierte problemas de red en `NETWORK_ERROR` y formatos inesperados en `INVALID_API_RESPONSE`.

La configuración de despliegue recupera puertos asignados y bloquea campos existentes para evitar volver a reservarlos. La petición usa `mirrorPorts: true`; consulta [[08 - Despliegues Docker]]. Existe un componente `analyze-relations-placeholder.tsx`: la vista completa de relaciones sigue pendiente.
''',
'11 - Desarrollo y pruebas': '''# Desarrollo y pruebas

Ejecuta desde la raíz del código. Los comandos siguientes documentan scripts existentes; no indican que hayan pasado durante esta revisión.

| Comando | Propósito |
| --- | --- |
| `npm ci` | Instala dependencias del lockfile y workspaces |
| `npm run start:dev` | Backend en watch |
| `npm run build` | Compila backend con Nest |
| `npm run lint` | Oxlint con análisis de tipos en src y test |
| `npm run format` | Prettier; modifica archivos |
| `npm run test` | Vitest, archivos `**/*.spec.ts` |
| `npm run test:watch` | Vitest en watch |
| `npm run test:cov` | Cobertura |
| `npm run test:e2e` | Config separada para `**/*.e2e-spec.ts` |
| `npm run prisma:generate` | Genera cliente Prisma |
| `npm run prisma:migrate` | Migraciones de desarrollo |
| `npm run prisma:deploy` | Aplica migraciones existentes |
| `npm run prisma:studio` | Inspección de datos |
| `npm --workspace @neoglito/web run dev` | Vite |
| `npm --workspace @neoglito/web run build` | TypeScript y build frontend |
| `npm --workspace @neoglito/web run lint` | ESLint frontend |

Consulta la observación sobre `prisma7.config.ts` en [[03 - Instalacion y configuracion]] si el CLI no detecta la configuración.

## Pruebas presentes

- Análisis de proyecto y extracción de variables YAML.
- Preparación del Compose y adaptación de puertos.
- Despliegue, consulta de asignaciones y clasificación.
- Runtime Docker y traducción de rutas al host.
- Catálogo de imágenes y discriminadores de clasificación.
- Búsqueda recursiva de archivos.
- Contratos de frontend para peticiones, clasificación y campos de puertos.
- Prueba e2e de la aplicación.

Antes de cambiar un contrato, revisa consumidores de `packages/shared`. Si cambias despliegues, verifica preparación YAML, reservas, fallo parcial y detención. Si cambias clasificación, verifica servicios sin publicación y resultados ambiguos. Algunas pruebas de integración pueden necesitar servicios reales; revisa sus fixtures y requisitos antes de ejecutarlas.
''',
'12 - Diagnostico y limites': '''# Diagnóstico y límites

## Problemas frecuentes

| Síntoma | Qué revisar |
| --- | --- |
| La API falla al arrancar | Docker operativo; `main.ts` lo comprueba antes de crear Nest |
| Error de DATABASE_URL | Variable definida y host correcto dentro/fuera de Compose |
| Error de cifrado | ENCRYPTION_SECRET_KEY debe decodificar a 32 bytes |
| JWT_SECRET is required | Completar `.env` |
| OAuth no vuelve al frontend | Client ID/Secret, callback idéntico al registrado y FRONTEND_URL |
| `/auth/me` responde 401 | Cookie, vencimiento, origen CORS y credenciales del cliente |
| Redis no conecta | REDIS_URL; `redis` es hostname interno del Compose |
| No encuentra Compose | Nombre compatible con el patrón actual; ver [[07 - Repositorios y analisis Compose]] |
| Código clonado desactualizado | El destino existente se reutiliza sin pull |
| Puerto en conflicto | Reservas Redis y listener real del servidor; TTL provisional de cinco minutos |
| Falla restauración al iniciar | Reservas de servicios persistidos activos que entran en conflicto |
| Servicio queda UNKNOWN | Revisar imagen, protocolos, comandos y configuración; la ambigüedad también guarda UNKNOWN |
| Sondas fallan desde la API | CONTAINER_PROBE_HOST y acceso a puertos publicados en el host |
| Build/bind mount falla | Traducción de rutas del cliente al host del daemon |
| Prisma no descubre configuración | Probar `--config prisma7.config.ts`; ver [[03 - Instalacion y configuracion]] |

Para revisar servicios del entorno:

```powershell
docker compose ps
docker compose logs --tail 100 api
docker compose logs --tail 100 redis postgres
```

## Límites y pendientes observados

- Los proyectos no tienen propietario User y el listado de persistencia es global.
- Registro de proyectos/repositorios y consulta de reservas no tienen guard JWT en los controladores revisados.
- La búsqueda usada por análisis se limita a `docker-compose*.yml`.
- Un servicio persiste un único puerto; no representa todas las publicaciones múltiples.
- La evidencia y los candidatos de clasificación no se almacenan.
- La vista de relaciones entre servicios tiene un placeholder.
- El README no refleja por completo módulos y endpoints actuales.
- Swagger declara algunos códigos de respuesta que no se fijan explícitamente en los handlers POST.

Estos puntos describen el estado del código; no se modificó la aplicación para corregirlos. Para ampliar la plataforma, considera propiedad por usuario, detección Compose más amplia, múltiples publicaciones y un modelo de relaciones/evidencia. Son propuestas de evolución, no funciones ya implementadas.
'''
}
sources = {
'00 - Inicio': ['README.md', 'package.json'],
'01 - Vision y flujo de uso': ['README.md', 'apps/web/src/pages/repository-selection-page.tsx'],
'02 - Arquitectura': ['src/app.module.ts', 'src/main.ts'],
'03 - Instalacion y configuracion': ['docker-compose.yml', 'Dockerfile', '.env.example', 'prisma7.config.ts'],
'04 - Autenticacion': ['src/auth/presentation/authentication.controller.ts', 'src/auth/infrastructure/passport/jwt.strategy.ts', 'src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts'],
'05 - API y contratos': ['src/project/presentation/project.controller.ts', 'src/repository/presentation/repository.controller.ts', 'src/deployment/presentation/deployment.controller.ts', 'src/ports/presentation/port.controller.ts', 'src/shared/presentation/interceptors/api-response.interceptor.ts', 'src/shared/presentation/filters/api-exception.filter.ts', 'packages/shared/src/repository/requests/deploy-compose.request.ts'],
'06 - Modelo de datos': ['prisma/models/user.prisma', 'prisma/models/github-connection.prisma', 'prisma/models/project.prisma', 'prisma/models/repository.prisma', 'prisma/models/deployment.prisma', 'src/project/infrastructure/persistence/prisma-project.repository.ts'],
'07 - Repositorios y analisis Compose': ['src/analisys/application/project-analysis.service.ts', 'src/repository/application/use-cases/repository/clone-repository.use-case.ts', 'src/shared/application/find-docker-files.ts'],
'08 - Despliegues Docker': ['src/deployment/infrastructure/compose/README.md', 'src/deployment/application/use-cases/deploy-compose.use-case.ts', 'src/container/infrastructure/docker/docker-compose-runtime.service.ts'],
'09 - Puertos y clasificacion': ['src/ports/infrastructure/classification/README.md', 'src/ports/application/draft-port-owner.ts', 'src/ports/infrastructure/reservations/redis-port-reservation.service.ts', 'src/startup/restore-deployment-port-reservations.service.ts', 'src/deployment/application/use-cases/get-deployment-ports.use-case.ts'],
'10 - Frontend': ['apps/web/package.json', 'apps/web/vite.config.ts', 'apps/web/src/app/app.tsx', 'apps/web/src/shared/api/client.ts', 'apps/web/src/features/projects/components/analyze/analyze-relations-placeholder.tsx'],
'11 - Desarrollo y pruebas': ['package.json', 'vitest.config.ts', 'vitest.config.e2e.ts', 'apps/web/package.json'],
'12 - Diagnostico y limites': ['src/main.ts', 'src/analisys/application/project-analysis.service.ts', 'src/startup/restore-deployment-port-reservations.service.ts', 'src/project/infrastructure/persistence/prisma-project.repository.ts']
}
out = root / 'Neoglito'
out.mkdir(exist_ok=True)
for title, body in notes.items():
    links = re.findall(r'\[\[([^\]]+)\]\]', body)
    assert all(link in notes for link in links), (title, links)
    footer = '\n## Fuentes del repositorio\n\n'
    for source in sources[title]:
        path = repo / source
        assert path.is_file(), source
        footer += f'- [{source}]({path.as_uri()})\n'
    content = '---\ntags:\n  - neoglito\n  - documentacion\nactualizado: 2026-10-10\ntipo: documentacion-tecnica\n---\n\n' + body.strip() + '\n' + footer
    (out / (title + '.md')).write_text(content, encoding='utf-8')
print(f'{len(notes)} notas generadas; enlaces internos y fuentes verificados.')
