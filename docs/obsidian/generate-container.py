from pathlib import Path
import re

base = Path(__file__).resolve().parent
repo = base.parent.parent
out = base / 'Container'
out.mkdir(exist_ok=True)

notes = {
'Container - Indice': ('''# Container · documentación técnica

`ContainerModule` proporciona el adaptador que ejecuta Docker Compose e inspecciona contenedores. Su contrato es `ContainerRuntimePort` y su implementación es `DockerComposeRuntime`. Contiene también la entidad de dominio `Container`, la traducción de rutas hacia el host del daemon y la comprobación inicial de Docker.

Documentación inferida del código revisado el **10 de octubre de 2026**. Los ejemplos ilustran contratos; no se ejecutaron comandos Docker ni operaciones de despliegue para redactar estas notas.

## Recorrido

1. [[Container - Flujo]]: ejecución, observación, clasificación y parada.
2. [[Container - Implementacion y contratos]]: inyección, métodos y estructuras de datos.
3. [[Container - Docker y rutas]]: comandos, proyectos Compose y bind mounts.
4. [[Container - ORM y estados]]: entidad, persistencia y actualización de estados.
5. [[Container - Endpoints y uso]]: rutas consumidoras, parámetros y respuestas.
6. [[Container - Configuracion diagnostico y pruebas]]: requisitos, errores, límites y cobertura.

## Responsabilidad

El módulo no tiene controladores ni acceso Prisma propio. Los casos de uso de `deployment` coordinan runtime, ORM y reservas de puertos. La clasificación vive en `ports` y utiliza metadatos y lectura de archivos facilitados por el runtime.

Los métodos `up`, `down` y `delete` tienen efectos sobre Docker. `list` e `inspect` consultan su estado. `readFile` y `listFiles` ejecutan utilidades dentro de un contenedor. `resolveHostPath` permite que los bind mounts preparados desde la API apunten al sistema de archivos que ve el daemon.
''', ['src/container/container.module.ts', 'src/container/application/container-runtime.port.ts', 'src/container/infrastructure/docker/docker-compose-runtime.service.ts', 'src/deployment/deployment.module.ts', 'src/ports/infrastructure/classification/container-classification.service.ts']),

'Container - Flujo': ('''# Container · flujo

## Creación y observación

```mermaid
sequenceDiagram
    participant U as DeployComposeUseCase
    participant C as Preparador Compose
    participant R as ContainerRuntimePort
    participant D as Docker CLI y daemon
    participant P as Prisma y reservas
    U->>C: prepare(Compose, deploymentId, configuración)
    C->>R: resolveHostPath(bind mounts)
    R-->>C: Rutas visibles para el daemon
    C-->>U: Compose propio, projectName y puertos
    U->>P: Reservar puertos y marcar building
    U->>R: up(directorio, Compose, projectName)
    R->>D: compose up --build -d
    D-->>R: Código de salida
    U->>P: Marcar starting y startedAt
    U->>R: list(directorio, Compose, projectName)
    R->>D: compose ps --all --format json
    R-->>U: Contenedores normalizados
    U->>P: Transferir reservas a IDs y guardar servicios
    U->>P: Marcar despliegue running
```

El descubrimiento de Compose y su pertenencia al proyecto se validan antes de crear el registro de despliegue. La preparación del YAML y las reservas no forman parte de `DockerComposeRuntime`.

`up` termina cuando Docker Compose sale con código 0. No espera un estado healthy ni sondea los contenedores hasta que estén running. El caso de uso hace un listado después; si no hay contenedores, lanza un error. Si sí hay, persiste sus estados y marca el **despliegue** como running, incluso si el estado observado de algún contenedor es otro.

## Fallo de arranque

El coordinador marca que se intentará iniciar el runtime antes de llamar a `up`, porque Docker podría crear recursos parcialmente antes de fallar. En su catch intenta `down` si existe un Compose preparado. Si falla esa limpieza, registra el error y continúa con la liberación de reservas. Después intenta marcar el despliegue failed y propaga el fallo.

No hay una transacción distribuida entre Docker, Redis y PostgreSQL. La limpieza es un intento de compensación; los fallos durante liberación o escritura pueden interrumpir el resto de ese catch. `ContainerModule` no realiza rollback ORM por sí mismo.

## Clasificación

`ClassifyDeploymentServicesUseCase` carga el despliegue y sus servicios, llama a `list` y exige que cada servicio persistido siga presente y esté running. Permite contenedores sin puerto publicado. Luego llama a `inspect` para todos los contenedores observados y entrega el contexto al clasificador.

El clasificador utiliza imagen, protocolos y evidencia adicional; para configuraciones de servidores web solicita `readFile` y `listFiles`. Esas llamadas ejecutan `docker exec`, pero no interpretan por sí mismas el contenido.

Tras clasificar, el caso de uso guarda tipo, puerto, estado, health y fecha observada en una transacción Prisma. Resultados no resueltos quedan como `UNKNOWN`. Los errores de observación/inspección se transforman en `ConflictException` en ese consumidor.

## Parada

`StopDeploymentUseCase` marca stopping, llama a `down`, libera las reservas por ID de contenedor y actualiza los servicios a exited/none. Marca el despliegue stopped con finishedAt. Si algo falla dentro de ese bloque, intenta marcar failed y vuelve a lanzar el error.

`down` ejecuta Compose down, no pause ni stop aislado: elimina los contenedores y redes que corresponda gestionar a Compose. Las filas de servicios permanecen como historial. `delete` añade flags de volúmenes y huérfanos, pero no se encontró un consumidor de ese método en los casos de uso revisados.
''', ['src/deployment/application/use-cases/deploy-compose.use-case.ts', 'src/deployment/application/use-cases/classify-deployment-services.use-case.ts', 'src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts', 'src/container/infrastructure/docker/docker-compose-runtime.service.ts', 'src/ports/infrastructure/classification/container-classification.service.ts']),

'Container - Implementacion y contratos': ('''# Container · implementación y contratos

## Inyección Nest

`ContainerModule` registra `DockerComposeRuntime` y publica el símbolo `CONTAINER_RUNTIME_PORT` mediante `useExisting`. El token reutiliza la instancia del proveedor; no crea una segunda implementación. El módulo exporta ese token, no una clase de controlador.

Lo importan `AppModule`, `DeploymentModule` y `PortModule`. Los consumidores reciben `@Inject(CONTAINER_RUNTIME_PORT)` con tipo `ContainerRuntimePort`.

```typescript
constructor(
  @Inject(CONTAINER_RUNTIME_PORT)
  private readonly runtime: ContainerRuntimePort,
) {}
```

## Métodos

| Método | Parámetros | Resultado / efecto |
| --- | --- | --- |
| `up` | `path`, `dockerCompose`, `projectName?` | `Promise<void>`; construir e iniciar en segundo plano |
| `list` | Los anteriores | `Promise<ContainerRuntimeService[]>`; observar servicios |
| `down` | Los anteriores | `Promise<void>`; ejecutar Compose down |
| `delete` | Los anteriores | `Promise<void>`; down con volúmenes y huérfanos |
| `inspect` | `containerIds: readonly string[]` | `Promise<ContainerInspection[]>` |
| `resolveHostPath` | `path: string` | `Promise<string>`; traducir ruta al host del daemon |
| `readFile` | `containerId: string`, `path: string` | `Promise<string ∣ null>` |
| `listFiles` | `containerId: string`, `directory: string` | `Promise<string[]>` |

Para Compose, `path` es el directorio de ejecución de respaldo y `dockerCompose` es la ruta pasada a `-f`. Si `projectName` tiene un valor no vacío, se lee `x-neoglito.projectDirectory` del YAML y ese directorio sustituye a `path`. Las condiciones se detallan en [[Container - Docker y rutas]].

## Resultado del listado

```typescript
interface ContainerRuntimeService {
  containerId: string;
  composeServiceName: string;
  port: number;
  status: 'created' | 'running' | 'paused' | 'restarting' | 'exited' | 'dead';
  health: 'starting' | 'healthy' | 'unhealthy' | 'none';
}
```

`list` acepta un array JSON, un objeto JSON individual o JSON por línea. Un output vacío acaba como lista vacía; un JSON mal formado propaga el error de parseo.

Lee `ID` o `Id`, `Service`, `State`, `Health` y `Publishers`. Filtra registros con identificador vacío. Convierte estado y health a minúsculas; valores desconocidos pasan a created y none. No exige que el nombre del servicio esté presente: puede quedar vacío.

`port` es el primer `PublishedPort` numérico entero entre 1 y 65535 cuyo `Protocol` sea tcp o no esté declarado. UDP se ignora. Un puerto serializado como string no es aceptado por este listado. Si no encuentra uno, usa 0. No conserva la IP ni todos los puertos.

## Resultado de inspección

```typescript
interface ContainerInspection {
  readonly containerId: string;
  readonly image: string;
  readonly aliases: readonly string[];
  readonly ports: readonly number[];
  readonly command: readonly string[];
  readonly env: Readonly<Record<string, string>>;
}
```

Con IDs vacíos devuelve `[]` sin ejecutar Docker. Con IDs, exige una respuesta JSON array y un `Id` no vacío por entrada. No devuelve resultados parciales si falla la llamada.

`image` viene de `Config.Image`. `command` concatena las entradas string de `Config.Entrypoint` y `Config.Cmd`. `aliases` combina la label `com.docker.compose.service`, el nombre sin `/` inicial y los aliases de redes; elimina vacíos y duplicados.

`env` divide `Config.Env` por el primer `=`; preserva valores como `a=b=c` y strings vacíos, omite entradas sin nombre/asignación y sobrescribe nombres repetidos con la última aparición. Es contexto interno: puede contener credenciales del contenedor y no forma parte de la respuesta pública de despliegue.

`ports` reúne todos los HostPort TCP publicados desde `NetworkSettings.Ports`, los convierte con `Number`, valida 1..65535 y elimina duplicados. No devuelve IP del host ni el puerto interno. Difiere de `list`, que conserva uno solo.

## Lectura dentro de contenedores

`readFile` devuelve stdout de `cat` o null ante cualquier error. `listFiles` divide stdout de `ls -1` por líneas, elimina vacías y devuelve [] ante cualquier error. No distingue archivo ausente, permisos, falta de utilidades, contenedor detenido, timeout o daemon inaccesible: todos pueden producir evidencia no disponible.
''', ['src/container/container.module.ts', 'src/container/application/container-runtime.port.ts', 'src/container/infrastructure/docker/docker-compose-runtime.service.ts', 'src/app.module.ts', 'src/deployment/deployment.module.ts', 'src/ports/port.module.ts']),

'Container - Docker y rutas': ('''# Container · Docker y rutas

## Comandos ejecutados

Para métodos Compose, el runtime construye este prefijo:

```text
docker compose [-p PROJECT] [--project-directory DIRECTORY] -f COMPOSE
```

| Método | Sufijo / comando |
| --- | --- |
| `up` | `up --build -d` |
| `list` | `ps --all --format json` |
| `down` | `down` |
| `delete` | `down --volumes --remove-orphans` |
| `inspect` | `docker container inspect ID...` |
| `readFile` | `docker exec ID cat PATH` |
| `listFiles` | `docker exec ID ls -1 DIRECTORY` |

Los argumentos se entregan como array a `spawn`, con `shell: false` y `windowsHide: true`. No se concatenan para ejecutar un shell. El ejecutable del runtime es siempre **`docker`**.

El código acumula stdout y stderr. Código 0 resuelve con stdout; otro código rechaza con `Docker termino con codigo N` y los outputs disponibles. Un error del proceso rechaza con `No se pudo ejecutar Docker: ...`. No hay streaming de logs ni límite explícito para los buffers acumulados.

## Timeouts

| Operación | Timeout pasado a spawn |
| --- | --- |
| Inspección y autoinspección de mounts | 10 000 ms |
| Lectura de archivos y listado dentro del contenedor | 5 000 ms |
| up, list, down, delete de Compose | No se configura timeout |

No hay política propia de reintentos. Las operaciones Compose pueden permanecer pendientes si el proceso no termina. Los errores de exec se convierten a null/[] por sus métodos, mientras que los de Compose e inspect se propagan.

## Proyecto explícito y directorio original

Cuando se recibe `projectName`, el runtime lee el YAML y exige `x-neoglito.projectDirectory` string y absoluto según `node:path.isAbsolute` del entorno. Si falta o es relativo, falla antes de ejecutar Docker con `El Compose del despliegue no declara su directorio de proyecto`.

El preparador genera un Compose propio con metadatos:

```yaml
x-neoglito:
  projectDirectory: /app/repo/usuario/api
  sourceComposePath: /app/repo/usuario/api/docker-compose.yml
```

El runtime usa projectDirectory tanto como `--project-directory` como `cwd`. Añade `-p` para seleccionar el proyecto del despliegue, incluso si el entorno heredado define otro `COMPOSE_PROJECT_NAME`. No comprueba expresamente la existencia del directorio: un cwd inválido puede hacer fallar spawn.

El nombre habitual es `neoglito-<deploymentId>`. Para operaciones posteriores, `deploymentRuntimeProjectName` lo reconstruye únicamente cuando el basename del YAML coincide con `.neoglito-<deploymentId>.compose.yml`. Para rutas antiguas devuelve undefined y conserva el comportamiento sin `-p` ni metadatos obligatorios.

## Traducción de bind mounts

Si no existe `/.dockerenv`, `resolveHostPath` devuelve la entrada intacta. Si existe, ejecuta `docker container inspect hostname()` para inspeccionar el contenedor de la API y obtener sus mounts. Guarda la promesa en `hostMounts`: las llamadas posteriores reutilizan esa inspección. Una promesa rechazada también queda almacenada y no se reintenta automáticamente.

`resolveDockerHostPath` normaliza con `posix.resolve`, selecciona el mount más específico por longitud de destination y exige que sea de tipo bind. Usa igualdad o prefijo con separador: `/application` no se confunde con `/app`.

Si una ruta está bajo un volume anidado, no usa el bind exterior como alternativa. Si no hay un bind compatible, falla con `La ruta ... no está compartida con el host de Docker mediante un bind mount`.

Ejemplos ilustrativos:

| Ruta dentro de la API | Mount origen → destino | Resultado para daemon |
| --- | --- | --- |
| `/app/repo/user/api` | `/host/proyecto` → `/app` | `/host/proyecto/repo/user/api` |
| `/app/repo/user/api` | `C:/Users/dev/proyecto` → `/app` | `/run/desktop/mnt/host/c/Users/dev/proyecto/repo/user/api` |
| `/app/node_modules/lib` | volume → `/app/node_modules` | Error, aunque exista un bind para `/app` |

La conversión de fuentes Windows usa la convención implementada para Docker Desktop: `/run/desktop/mnt/host/<unidad-minúscula>/...`. No es una configuración universal de todos los daemons.

`YamlDeploymentComposeService` llama a esta traducción para fuentes bind al preparar los volúmenes del YAML. No traduce arbitrariamente todas las rutas del runtime ni asegura que un daemon remoto tenga los archivos locales. La autoinspección también depende de que el hostname permita identificar el contenedor de la API.
''', ['src/container/infrastructure/docker/docker-compose-runtime.service.ts', 'src/container/infrastructure/docker/docker-host-path.ts', 'src/deployment/application/ports/deployment-compose.port.ts', 'src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts']),

'Container - ORM y estados': ('''# Container · ORM y estados

## Entidad de dominio

`Container` es una clase con propiedades readonly inicializadas en su constructor: `id`, `composeServiceName`, `port`, `status`, `health`, `serviceType`, `lastObservedAt` y `deploymentId`. No ejecuta Docker, no guarda datos y no valida transiciones por sí misma.

El ID corresponde al identificador observado de Docker. La entidad se reconstruye desde filas ORM mediante `toDeployment`, en el módulo de despliegues.

## Persistencia Prisma

El contenedor se guarda como `DeploymentService`, no como un modelo llamado Container:

| Campo | Prisma / origen |
| --- | --- |
| `id` | String, clave primaria sin default; containerId observado |
| `composeServiceName` | String; servicio Compose |
| `port` | Int; primer puerto observado o 0 |
| `status` | ContainerStatus |
| `health` | ContainerHealth |
| `serviceType` | ServiceType, default UNKNOWN |
| `lastObservedAt` | DateTime, default now; consumidores actualizan fecha |
| `deploymentId` | String; FK a Deployment con onDelete Cascade |

Tiene índices sobre deploymentId y status. `port` no es unique ni declara una restricción de rango en el schema. Un contenedor puede publicar varios puertos, pero este modelo conserva un solo Int; la lista completa de inspect no se guarda aquí.

`Deployment` tiene ID UUID generado, projectId, composePath, estado y fechas. Su relación con Project también usa cascada. Las cascadas son del ORM/base de datos: no ejecutan `docker compose down` ni liberan reservas Redis automáticamente.

## Estados separados

| Concepto | Valores |
| --- | --- |
| Contenedor | created, running, paused, restarting, exited, dead |
| Health | starting, healthy, unhealthy, none |
| Despliegue | pending, building, starting, running, failed, stopping, stopped |
| Tipo de servicio | BACKEND, FRONTEND, DATABASE, CACHE, MESSAGE_BROKER, WORKER, SCHEDULER, REVERSE_PROXY, UNKNOWN |

El estado running del despliegue indica el avance del coordinador; no implica que todas sus filas tengan status running ni health healthy. El runtime normaliza valores desconocidos a created/none, sin persistir el texto Docker original.

## Escrituras de consumidores

Al desplegar, `DeployComposeUseCase` crea las filas con `createMany` desde `runtime.list`; el tipo queda UNKNOWN por default. Tras transferir las reservas por containerId, actualiza el despliegue a running.

Al clasificar, el caso de uso actualiza tipo, puerto, estado, health y lastObservedAt de las filas persistidas en una transacción Prisma. Esa clasificación no sincroniza reservas Redis al actualizar un puerto observado.

Al detener, el caso de uso libera reservas y actualiza las filas a exited/none con una nueva fecha; conserva el valor numérico port en la base. La consulta pública de puertos lo transforma a null cuando el despliegue no está activo.

No hay un monitor periódico en `ContainerModule`: los datos guardados pueden quedar desactualizados si alguien modifica Docker externamente. Listar despliegues lee la base, no vuelve a inspeccionar Docker. Startup reconstruye reservas usando los estados guardados, no el estado real del daemon.
''', ['src/container/domain/entities/container.entity.ts', 'prisma/models/deployment.prisma', 'src/deployment/application/use-cases/deploy-compose.use-case.ts', 'src/deployment/application/use-cases/classify-deployment-services.use-case.ts', 'src/deployment/application/use-cases/get-deployment-ports.use-case.ts', 'src/startup/restore-deployment-port-reservations.service.ts']),

'Container - Endpoints y uso': ('''# Container · endpoints y uso

No existe un controlador `/container` en este módulo. Las operaciones públicas se coordinan desde `DeploymentController`, protegido por `JwtAuthGuard`. La sesión se obtiene de cookie access_token o Bearer JWT; no se envía userId en el body.

## Rutas relacionadas

| Método y ruta | Parámetros | Relación con container | Éxito esperado |
| --- | --- | --- | --- |
| POST `/deployment` | JSON de despliegue | Prepara Compose, llama up/list y persiste | 201 |
| POST `/deployment/:deploymentId/stop` | ID en ruta; sin body utilizado | Llama down y actualiza ORM/reservas | 201 |
| POST `/deployment/:deploymentId/classify` | ID en ruta; sin body utilizado | Llama list/inspect y clasificador | 201 |
| GET `/deployment/project/:projectId` | ID numérico en ruta | Devuelve filas persistidas con servicios | 200 |
| GET `/deployment/:deploymentId/ports` | ID en ruta | Consulta puertos guardados y metadatos Compose | 200 |

Son estados esperados por los decoradores actuales, no respuestas verificadas en vivo. Stop declara 200 en Swagger pero no usa `@HttpCode`, por lo que mantiene el 201 por defecto de POST. `projectId` de GET utiliza ParseIntPipe. Los deploymentId no usan ParseUUIDPipe, aunque Swagger los describa como UUID.

## Parámetros del despliegue

| Campo JSON | Tipo esperado | Obligatorio | Uso |
| --- | --- | --- | --- |
| `projectId` | number | Sí | Proyecto que contiene el Compose |
| `composePath` | string | Sí | Ruta de un Compose descubierto para el proyecto |
| `environment` | array | No | Variables a aplicar al YAML preparado |
| `ports` | array | No | Configuración de puertos por servicio |
| `mirrorPorts` | boolean | No | Solicitar adaptación del puerto interno y publicado |

Cada elemento environment usa `key: string`, `value: string` y `service?: string`. Si se omite service, el preparador aplica la variable a todos los servicios. Cada elemento ports usa `service`, `hostIp`, `publishedPort`, `targetPort`, `protocol` y `mappingType`, según el contrato compartido ComposePort.

Los DTO contienen metadatos Swagger, sin validadores; main.ts no registra ValidationPipe. El preparador y casos de uso realizan comprobaciones concretas, pero no debe asumirse validación automática completa del JSON.

Ejemplo mínimo, usando una ruta ya descubierta por la API:

```http
POST /deployment
Authorization: Bearer <JWT>
Content-Type: application/json

{"projectId": 12, "composePath": "/app/repo/usuario/api/docker-compose.yml"}
```

Las rutas son del backend, no del equipo que hace la petición. La solicitud inicia un despliegue; no es una consulta de previsualización. Las modificaciones de YAML y las reservas son responsabilidad de deployment/ports.

## Respuestas

Las respuestas se envuelven con `{ success, data, error, meta }`. La respuesta de desplegar, detener o clasificar contiene un DeploymentResponse con IDs, ruta Compose, estado, fechas ISO y `services`:

```json
{
  "id": "container-id-ilustrativo",
  "composeServiceName": "api",
  "port": 8080,
  "status": "running",
  "health": "none",
  "serviceType": "UNKNOWN",
  "lastObservedAt": "2026-10-10T06:00:00.000Z",
  "deploymentId": "deployment-id-ilustrativo"
}
```

Este bloque es un elemento ilustrativo de services, no la respuesta completa. El contrato público no devuelve env, command ni aliases de inspect.

GET de puertos devuelve deploymentId, projectId, status, sourceComposePath, projectDirectory y servicios con containerId, composeServiceName y port. Solo considera activos los despliegues building/starting/running; fuera de ellos devuelve port null y metadatos null. También devuelve null si el puerto guardado es 0. No consulta puertos en vivo con el runtime.

## Errores

401 indica problemas con la sesión. Los casos de uso responden 404 ante proyecto/despliegue inexistente. El despliegue puede rechazar con 400 un Compose ajeno al proyecto o configuración inválida. Clasificar produce 409 cuando faltan contenedores, alguno no está running o falla su observación/inspección.

Los errores genéricos del runtime se transforman a 500 por el filtro global salvo que un consumidor los convierta a otra HttpException. El estado depende del punto donde ocurra el fallo; no todo error Docker produce el mismo código.

## Consumo interno

```typescript
// Proveedor Nest que ya inyectó CONTAINER_RUNTIME_PORT:
const observed = await this.runtime.list(directory, composePath, projectName);
const details = await this.runtime.inspect(observed.map(x => x.containerId));
```

Las llamadas up/down/delete no escriben ORM automáticamente. Un consumidor que las use directamente debe coordinar el estado que necesite guardar. No hay endpoints públicos para inspect, readFile, listFiles o delete en el módulo revisado.
''', ['src/deployment/presentation/deployment.controller.ts', 'src/deployment/application/dto/deploy-compose.dto.ts', 'src/deployment/application/responses/deployment.response.ts', 'src/deployment/application/use-cases/get-deployment-ports.use-case.ts', 'src/deployment/application/use-cases/classify-deployment-services.use-case.ts', 'src/container/application/container-runtime.port.ts', 'src/main.ts', 'src/shared/presentation/interceptors/api-response.interceptor.ts', 'src/shared/presentation/filters/api-exception.filter.ts']),

'Container - Configuracion diagnostico y pruebas': ('''# Container · configuración, diagnóstico y pruebas

## Requisitos

El runtime necesita `docker` en el PATH del proceso Node, acceso al daemon elegido por el entorno Docker y el comando `docker compose` disponible. Las operaciones Compose necesitan archivos y directorios legibles desde la API. Las lecturas dentro del contenedor requieren que se pueda ejecutar allí cat/ls; no funcionan como una copia de archivos de un contenedor detenido.

En docker-compose.yml de Neoglito, la API monta el checkout en `/app` y el socket `/var/run/docker.sock` para utilizar el daemon del host. Aísla `/app/node_modules` con un volume. El traductor de rutas rechaza ese volume cuando se solicita como origen bind para otro contenedor.

## Variables y alcance

| Variable / condición | Dónde se usa |
| --- | --- |
| `DOCKER_PATH` | Comprobación inicial assertDockerIsRunning; el runtime no la utiliza |
| PATH y entorno Docker heredado | spawn usa el ejecutable docker y entorno del proceso |
| `COMPOSE_PROJECT_NAME` | Entorno heredado; los despliegues actuales pasan -p explícito |
| `DEPLOYMENT_COMPOSE_DIRECTORY` | Preparador deployment; default .neoglito/deployments |
| `CONTAINER_PROBE_HOST` | Clasificador, no runtime; default 127.0.0.1 |
| `/.dockerenv` | Detección usada para activar traducción de rutas |

En Compose de Neoglito, CONTAINER_PROBE_HOST tiene fallback host.docker.internal y se agrega host-gateway. Permite al clasificador alcanzar puertos publicados desde la API en Docker; no modifica los resultados de runtime.list/inspect.

## Comprobación al arrancar

`assertDockerIsRunning` se llama desde main.ts antes de crear la aplicación. Prueba DOCKER_PATH, docker, docker.exe y la ubicación habitual de Docker Desktop Windows. Ejecuta `info --format {{.ServerVersion}}` con timeout de 10 segundos por intento.

Si el ejecutable no existe (ENOENT), sigue con el siguiente candidato. Si se ejecuta pero retorna un estado no cero, termina la búsqueda y reporta daemon no disponible. Otros errores de ejecución producen un fallo de verificación. No inicia Docker, no valida Compose y no configura el ejecutable que usará el runtime.

Por ello, el arranque puede funcionar mediante DOCKER_PATH y una operación posterior fallar porque `docker` no está en PATH. La comprobación inicial tampoco garantiza que el daemon siga disponible posteriormente.

## Diagnóstico

| Síntoma | Causa a revisar |
| --- | --- |
| Docker verificado al arrancar, pero falla el runtime | Diferencia entre DOCKER_PATH y ejecutable docker del runtime |
| docker compose no reconocido | Disponibilidad del comando Compose en el proceso |
| No se pudo ejecutar Docker | PATH, permisos o cwd inexistente |
| Compose sin directorio de proyecto | projectName recibido pero x-neoglito.projectDirectory ausente/no absoluto |
| Ruta no compartida con el host | Fuente fuera de bind mount o dentro de un volume |
| Error al autoinspeccionar API | Acceso al daemon e identificación mediante hostname |
| Listado con port 0 | No hay publicación TCP numérica válida; UDP se ignora |
| Solo aparece un puerto guardado | list y ORM conservan el primero; inspect reúne todos |
| Estado created/health none inesperado | Valores desconocidos normalizados por el listado |
| Configuración no disponible al clasificar | readFile/listFiles ocultan cualquier fallo de exec como null/[] |
| Despliegue running con servicio no running | No hay espera de readiness; son estados separados |
| Datos guardados distintos de Docker | Ausencia de reconciliación periódica en ContainerModule |
| Operación Compose pendiente indefinidamente | No hay timeout configurado para esos comandos |

El runtime registra `[docker:compose] Ejecutando` y `Comando completado`, con argumentos y cwd. Los errores de proceso incluyen stderr/stdout cuando están disponibles. Los métodos de lectura interna no registran la causa que convierten a null/[].

## Pruebas existentes

`docker-compose-runtime.service.spec.ts` verifica autoinspección de mounts cacheada, rutas locales sin traducción, proyecto explícito en up/list/down, rechazo de metadatos faltantes, servicios sin puertos, exclusión UDP, JSON por línea, metadatos de inspect, IDs vacíos y lectura/listado mediante exec. También verifica errores como evidencia no disponible y fallos de inspección propagados.

Estas pruebas simulan spawn y respuestas: no necesitan un daemon real y no demuestran disponibilidad de Docker, ejecución de imágenes o eliminación efectiva de recursos.

`docker-host-path.spec.ts` verifica fuentes Windows para Docker Desktop, selección del mount más profundo, fuentes Linux y rechazo de prefijos ambiguos o volumes anidados. Son pruebas del helper de traducción.

Se revisaron esas pruebas como evidencia del contrato, pero **no se ejecutaron durante la documentación**. No se modificó código de aplicación ni se iniciaron/detuvieron contenedores.

Para verificar la integración manualmente, usar un proyecto de prueba con Compose conocido, desplegarlo mediante la API, contrastar servicios observados y guardados, clasificar y detener el despliegue. Verificar los efectos sobre recursos y reservas desde ese flujo. El método delete tiene flags que solicitan eliminar volúmenes y huérfanos, y no es necesario para validar el flujo normal de parada.
''', ['docker-compose.yml', 'src/main.ts', 'src/container/infrastructure/docker/assert-docker-is-running.ts', 'src/container/infrastructure/docker/docker-compose-runtime.service.ts', 'src/container/infrastructure/docker/docker-compose-runtime.service.spec.ts', 'src/container/infrastructure/docker/docker-host-path.spec.ts', 'src/ports/infrastructure/classification/container-classification.service.ts', 'src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts']),
}

for title, (body, sources) in notes.items():
    for link in re.findall(r'\[\[([^\]]+)\]\]', body):
        assert link in notes, (title, link)
    footer = '\n## Fuentes del código\n\n'
    for source in sources:
        file = repo / source
        assert file.is_file(), source
        footer += f'- [{source}]({file.as_uri()})\n'
    metadata = '---\ntags:\n  - neoglito\n  - container\n  - documentacion-tecnica\nfuncionalidad: container\nactualizado: 2026-10-10\n---\n\n'
    (out / f'{title}.md').write_text(metadata + body.strip() + '\n' + footer, encoding='utf-8')
print(f'{len(notes)} notas de container; enlaces internos y fuentes verificados.')
