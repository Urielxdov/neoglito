from pathlib import Path
import re

base = Path(__file__).resolve().parent
repo = base.parent.parent
out = base / 'Deployment'
out.mkdir(exist_ok=True)

notes = {
'Deployment - Indice': ('''# Deployment · documentación técnica

`DeploymentModule` coordina el despliegue de un archivo Compose perteneciente a un proyecto: prepara un YAML independiente, reserva puertos, ejecuta Docker, persiste contenedores y permite consultar, clasificar y detener el despliegue.

Documentación inferida del código revisado el **10 de octubre de 2026**. Los ejemplos ilustran los contratos actuales; no se realizaron despliegues para redactarla.

## Recorrido

1. [[Deployment - Flujo y estados]]: creación, fallos, parada y clasificación.
2. [[Deployment - Implementacion y contratos]]: módulos, inyección, entidades y contratos internos.
3. [[Deployment - Preparacion Compose]]: YAML generado, variables, puertos, rutas y aislamiento.
4. [[Deployment - Modo espejo]]: adaptación de listeners y URLs.
5. [[Deployment - ORM y reservas]]: Prisma, Redis y consistencia.
6. [[Deployment - Endpoints]]: rutas, parámetros, respuestas y errores.
7. [[Deployment - Uso y frontend]]: consumo HTTP y comportamiento de la interfaz.
8. [[Deployment - Configuracion diagnostico y pruebas]]: configuración, límites y pruebas existentes.

## Módulos relacionados

- [[Analisis - Indice]] descubre los archivos Compose de los repositorios del proyecto.
- [[Container - Indice]] ejecuta Compose e inspecciona contenedores.
- [[Startup - Indice]] reconstruye reservas desde servicios persistidos al arrancar.
- [[Autenticacion - Indice]] aporta el JWT que protege los controladores.

El módulo de puertos proporciona reservas y clasificación. Parte del catálogo de tipos, imágenes y protocolos está alojada en el dominio de deployment, aunque la cadena clasificadora se implementa en `src/ports`.
''', ['src/deployment/deployment.module.ts', 'src/deployment/presentation/deployment.controller.ts']),

'Deployment - Flujo y estados': ('''# Deployment · flujo y estados

## Desplegar

```mermaid
sequenceDiagram
    participant C as Cliente
    participant U as DeployComposeUseCase
    participant A as ProjectAnalysisService
    participant Y as Preparador Compose
    participant P as Prisma
    participant R as Reservas
    participant D as Runtime Docker
    C->>U: projectId, composePath, configuración
    U->>A: getComposeFiles(userId, projectId)
    A-->>U: Compose descubiertos
    U->>U: Verificar pertenencia de la ruta
    U->>P: Crear Deployment pending
    U->>Y: prepare(archivo, deploymentId, configuración)
    Y-->>U: composePath, projectName, publishedPorts
    U->>P: Guardar ruta generada
    loop Cada puerto TCP publicado fijo
        U->>R: Liberar reserva del formulario y holdPort
    end
    U->>P: building
    U->>R: handoff de todos los holds
    U->>D: up --build -d
    U->>P: starting y startedAt
    U->>D: list
    D-->>U: Servicios observados
    U->>R: Liberar owners temporales
    U->>R: restorePort por containerId con port mayor que 0
    U->>P: createMany DeploymentService
    U->>P: running e incluir servicios
    U-->>C: DeploymentResponse
```

La pertenencia se compara normalizando con `resolve`, separadores `/` y minúsculas. También se hace en Linux, donde puede ignorar diferencias de mayúsculas del sistema de archivos. Se ejecuta el archivo candidato descubierto, no la cadena recibida directamente.

La creación de pending ocurre antes del bloque de preparación. Una configuración inválida puede dejar un registro failed; una ruta que no pertenezca al proyecto se rechaza antes de crear el registro.

El endpoint espera todo el caso de uso: no devuelve un job ni inicia una cola en segundo plano. Docker usa modo detached, pero su proceso Compose debe finalizar para que la petición continúe.

## Estados

```mermaid
flowchart LR
    P[pending] --> B[building]
    B --> S[starting]
    S --> R[running]
    R --> T[stopping]
    T --> X[stopped]
    P -. fallo .-> F[failed]
    B -. fallo .-> F
    S -. fallo .-> F
    T -. fallo .-> F
```

Es el recorrido habitual del coordinador, no una máquina de estados validada. Stop no restringe el estado previo. Clasificar tampoco exige explícitamente Deployment.status running; exige que sus contenedores persistidos estén presentes y running en la observación actual.

`startedAt` se escribe después de que up termina. El estado running del despliegue se guarda después de observar y persistir servicios. No se espera health healthy ni se comprueba que todos los servicios observados estén running; una lista no vacía basta para continuar el despliegue.

## Compensación de fallos

Antes de llamar a up se establece `runtimeStarted = true`. Si up crea recursos parcialmente y falla, el catch intenta down sobre el proyecto generado. Si falla down, registra el error y continúa. Luego libera los owners temporales y los owners de contenedores que alcanzaron a restaurarse, escribe failed/finishedAt y propaga el error.

No elimina el YAML generado ni borra las filas de servicios que ya se hubieran creado. Si una liberación o escritura falla, puede interrumpir el resto de la compensación. Las operaciones paralelas mediante Promise.all no se cancelan cuando una de ellas rechaza. No hay atomicidad entre Docker, archivos, Redis y PostgreSQL.

## Detener

Stop carga el despliegue o devuelve 404; escribe stopping y ejecuta down usando el composePath guardado. Después consulta los IDs persistidos, libera sus reservas, actualiza servicios a exited/none y lastObservedAt, y guarda stopped/finishedAt.

Down elimina los contenedores y redes gestionados por Compose. No usa la variante delete con `--volumes --remove-orphans`. Conserva filas y valores port como historial. Un fallo dentro del bloque de parada intenta escribir failed; ese catch no actualiza finishedAt. La escritura inicial de stopping está fuera de ese catch.

## Clasificar

Clasificación carga servicios y rechaza una lista vacía. Observa Docker y verifica cada ID persistido y su estado running. Inspecciona todos los contenedores observados para aportar contexto de uso mutuo; exige inspección y resultado para cada servicio guardado.

Guarda tipo resuelto o UNKNOWN, puerto, status, health y una fecha común mediante `$transaction`. No cambia el estado del despliegue ni sus fechas de inicio/fin. No agrega nuevos servicios ni sustituye IDs si Docker recreó un contenedor. Fallos de listado/inspección se convierten a 409; otros errores del clasificador pueden propagarse como 500.
''', ['src/deployment/application/use-cases/deploy-compose.use-case.ts', 'src/deployment/application/use-cases/classify-deployment-services.use-case.ts', 'src/container/infrastructure/docker/docker-compose-runtime.service.ts']),

'Deployment - Implementacion y contratos': ('''# Deployment · implementación y contratos

## Composición Nest

DeploymentModule importa AuthModule, PrismaModule, AnalysisModule, ContainerModule y PortModule. Registra DeploymentController y ProjectDeploymentController. No declara exports.

| Proveedor | Responsabilidad |
| --- | --- |
| DeployComposeUseCase | Validar candidato, preparar, reservar, arrancar y guardar |
| GetProjectDeploymentsUseCase | Verificar proyecto y listar registros con servicios |
| StopDeploymentUseCase | Down, liberar reservas y guardar parada |
| ClassifyDeploymentServicesUseCase | Observar, inspeccionar, clasificar y actualizar |
| GetDeploymentPortsUseCase | Leer asignaciones y metadatos guardados |
| DEPLOYMENT_COMPOSE_PORT → YamlDeploymentComposeService | Preparar YAML y recuperar su procedencia |

Los casos de uso acceden directamente a PrismaService; no existe un repositorio Deployment intermedio. Inyectan las interfaces mediante símbolos CONTAINER_RUNTIME_PORT, PORT_RESERVATION_PORT y CONTAINER_CLASSIFICATION_PORT según la operación.

## Contrato del preparador

```typescript
interface PreparedDeploymentCompose {
  composePath: string;
  projectName: string;
  publishedPorts: number[];
}

interface DeploymentComposePort {
  prepare(sourcePath: string, deploymentId: string,
    configuration: DeploymentComposeConfiguration
  ): Promise<PreparedDeploymentCompose>;
  readSource(composePath: string, deploymentId: string): Promise<{
    sourceComposePath: string | null;
    projectDirectory: string | null;
  }>;
}
```

DeploymentComposeConfiguration toma `environment`, `ports` y `mirrorPorts` de DeployComposeRequest. El token usa useClass. El preparador no ejecuta up ni guarda registros Prisma; sí puede inspeccionar mounts mediante resolveHostPath al preparar bind mounts.

## Entidades y mapeos

Deployment contiene propiedades readonly: id, projectId, composePath, status, createdAt, startedAt, finishedAt y services (`Container[]`). No implementa reglas de transición ni métodos de persistencia.

`toDeployment` reconstruye Deployment y Container desde un registro Prisma. `toDeploymentResponse` convierte fechas a ISO y fechas opcionales a null. El tipo compartido expone status/health/serviceType como string, mientras que el dominio y Prisma manejan conjuntos de valores definidos.

## Tipos y catálogo

ServiceType define BACKEND, FRONTEND, DATABASE, CACHE, MESSAGE_BROKER, WORKER, SCHEDULER, REVERSE_PROXY y UNKNOWN.

`SERVICE_IMAGE_CATALOG` indexa imágenes normalizadas. `normalizeImageRef` elimina digest, tag, registry reconocido y prefijo library, y convierte a minúsculas. Una imagen como postgres aporta DATABASE; Redis puede aportar CACHE o MESSAGE_BROKER; nginx puede aportar REVERSE_PROXY o FRONTEND. Herramientas conocidas pueden resolver explícitamente UNKNOWN. Fuera del catálogo, lookupImage devuelve undefined. La construcción del índice rechaza imágenes duplicadas.

`PROTOCOL_SERVICE_TYPES` relaciona sondas con candidatos: postgres/mysql/mongo → DATABASE; resp → CACHE o MESSAGE_BROKER; HTTP → BACKEND, FRONTEND, REVERSE_PROXY o DATABASE. La cadena de `ports` consume estas reglas junto con evidencia adicional. El catálogo no implica que toda imagen ambigua tenga un tipo definitivo.
''', ['src/deployment/deployment.module.ts', 'src/deployment/application/ports/deployment-compose.port.ts', 'src/deployment/domain/entities/deployment.entity.ts', 'src/deployment/application/responses/deployment.response.ts', 'src/deployment/domain/value-objects/service-type.ts', 'src/deployment/domain/services/service-image-catalog.ts', 'src/deployment/domain/services/protocol-service-type.ts']),

'Deployment - Preparacion Compose': ('''# Deployment · preparación Compose

## Archivo independiente

prepare lee el archivo autorizado y parsea YAML con merge keys habilitadas. Si falla lectura/parseo, responde 400. Exige un objeto services no vacío y cada servicio como objeto. Crea una copia superficial de cada servicio antes de modificarlo.

Aplica variables, valida mirrorPorts, modifica publicaciones y adapta listeners si procede; después traduce bind mounts. Establece name y metadatos:

```yaml
name: neoglito-<deploymentId>
x-neoglito:
  projectDirectory: /app/repo/usuario/api
  sourceComposePath: /app/repo/usuario/api/docker-compose.yml
```

Guarda el resultado en `DEPLOYMENT_COMPOSE_DIRECTORY` o `.neoglito/deployments`, resuelto desde el cwd. El archivo se llama `.neoglito-<deploymentId>.compose.yml`. mkdir solicita modo 0700 y writeFile modo 0600 con flag wx: no sobrescribe un archivo existente. Esos modos no equivalen a una configuración de ACL garantizada en Windows.

El original permanece sin cambios. El YAML generado puede contener valores sensibles enviados como environment. No se elimina al detener ni en la compensación de un despliegue fallido.

## Variables

| Comprobación | Comportamiento |
| --- | --- |
| environment omitido | Usa lista vacía |
| environment suministrado | Debe ser array |
| key | String que cumpla `[A-Za-z_][A-Za-z0-9_]*` |
| value | String sin carácter NUL; puede ser vacío |
| service | Si aparece, debe identificar un servicio existente |
| service omitido | Aplica a todos los servicios |
| Repetición del par servicio/key en la petición | 400, incluso si se combina una asignación global y una específica |

Para servicios modificados convierte environment de lista a mapa o copia su mapa previo. Conserva variables no sobrescritas. Cada `$` del valor recibido se escribe como `$$` para tratarlo como literal ante Compose. No reemplaza todas las interpolaciones del archivo ni carga automáticamente las variables descubiertas por análisis.

## Publicaciones

ports debe ser array. Cada cambio debe señalar un servicio existente, targetPort string, protocol tcp/udp y publishedPort string o null. Busca una publicación original no usada que coincida en **targetPort, protocol y hostIp**. No usa mappingType para encontrarla ni para validar el cambio.

Sin modo espejo conserva el target original. Un publishedPort null deja la asignación de host a Docker. En sintaxis larga conserva opciones del mapping y cambia published; en sintaxis corta reconstruye host/publicado/target/protocolo. Los mappings no incluidos en la petición se conservan.

Valida publicaciones explícitas como entero decimal o rango `inicio-fin`, entre 1 y 65535 y con inicio ≤ fin. Después recorre **todo el YAML final** y reúne cada puerto TCP fijo, expandiendo rangos. Rechaza duplicados numéricos incluso con hostIp diferentes. UDP conserva su configuración pero no forma parte de las reservas TCP. Interpolaciones en published como `${HOST_PORT}` no satisfacen la validación numérica.

La validación no reemplaza `docker compose config` ni verifica todas las opciones y restricciones de Compose. El target y tamaños de rangos no reciben una validación completa equivalente a la del puerto publicado.

## Rutas y recursos

El runtime usa `--project-directory` con el directorio original al ejecutar archivos actuales. Esto mantiene el contexto para las rutas relativas que resuelve Compose. Los bind mounts long syntax con type bind y source string, y los short syntax reconocidos con fuente de ruta, se resuelven desde ese directorio y se traducen mediante ContainerRuntimePort.

La sintaxis corta reconocida pasa a larga conservando read_only, propagation y selinux reconocidos. Volúmenes nombrados y anónimos permanecen como tales. La traducción detallada depende de mounts y daemon; consultar [[Container - Docker y rutas]].

Si un servicio tenía container_name, se sustituye por `neoglito-<id>-<service>`. En networks y volumes con objeto, name explícito y external falsy, se cambia name al prefijo del despliegue. Los recursos externos mantienen sus referencias y pueden compartirse; los bind mounts también pueden compartir datos. El aislamiento del proyecto Compose no garantiza aislamiento de todo almacenamiento.

## Compatibilidad de registros antiguos

deploymentRuntimeProjectName reconstruye el proyecto explícito solo cuando el basename coincide exactamente con el archivo generado esperado para ese ID. En otras rutas devuelve undefined y conserva la selección antigua de Compose.

readSource devuelve ruta y dirname para archivos antiguos que apuntan al original. Para archivos generados actuales lee x-neoglito y devuelve sus campos string, o null si faltan. No captura errores de lectura/parseo: consultar puertos activos puede fallar si el YAML ya no existe.
''', ['src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts', 'src/deployment/application/ports/deployment-compose.port.ts', 'src/shared/application/compose-ports.ts']),

'Deployment - Modo espejo': ('''# Deployment · modo espejo

`mirrorPorts: true` cambia tanto el puerto publicado como el target de los mappings enviados e intenta adaptar el listener. Omitido o false conserva el puerto interno original. El frontend actual lo envía true.

## Condiciones

Cada mapping enviado en este modo necesita protocol tcp y target/published individuales formados por dígitos. No permite published null, rangos ni UDP para esos cambios. Si un servicio tiene varios cambios con distintos puertos finales, los rechaza. Si el puerto interno previo y final son iguales, omite la adaptación del listener de ese servicio.

No adapta automáticamente todos los listeners del YAML. Solo procesa los cambios recibidos en ports. Si no sabe configurar uno, devuelve 400 antes de arrancar Docker.

## Adaptaciones implementadas

| Detección | Modificación |
| --- | --- |
| Último segmento de image igual a postgres, sin tag/digest | Ajusta command con postgres -p y añade PGPORT |
| Último segmento de image igual a redis, sin tag/digest | Ajusta command con redis-server --port |
| Comando reconocido de Vite o desarrollo de @neoglito/web | Ajusta --port y añade PORT |
| environment ya contiene PORT o comando coincide con npm run start | Asigna PORT |
| Otro listener | Rechaza con mensaje para configurar PORT o command |

Para postgres/redis acepta comandos ausentes, arrays de strings y strings simples sin comillas, saltos de línea ni ciertos operadores shell. Un ejecutable diferente puede hacer fallar la adaptación. No se usa el catálogo general de imágenes para detectar estos listeners: la detección del helper es más limitada.

Redis adapta healthcheck solo cuando test es array CMD/redis-cli. Otras variantes array se rechazan; variantes no array no reciben esta adaptación. No existe una reescritura general de healthchecks para todas las aplicaciones. En expose cambia entradas iguales al puerto interno anterior.

Asignar PORT presupone que la aplicación lo respeta. El helper no verifica en ejecución que realmente escuche ahí.

## URLs de otros servicios

Recorre valores string de environment interpretables como URL con puerto explícito. Para hostname igual al nombre del servicio o su container_name original, busca el puerto interno anterior. Para localhost, 127.0.0.1 y host.docker.internal busca el publicado anterior, o el interno si no había publicado fijo.

Solo reescribe si encuentra exactamente un cambio compatible. Conserva el resto del string mediante sustitución del puerto. No reescribe DSN sin formato URL, URLs sin puerto explícito, referencias ambiguas ni variables en archivos externos. Tampoco cambia el hostname cuando posteriormente renombra container_name.

Ejemplo conceptual, enviado con targetPort 5432 y publishedPort 15432:

```text
Antes: db publica 5432:5432; api usa postgresql://db:5432/app
Después: db publica 15432:15432, escucha con postgres -p 15432
         api usa postgresql://db:15432/app
```

Estas reglas describen una adaptación soportada por el código, no una garantía universal de conectividad. Para mantener el target original desde la API, usar mirrorPorts false y enviar el published deseado.
''', ['src/deployment/infrastructure/compose/mirror-service-ports.ts', 'src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts', 'apps/web/src/features/projects/deployment-request.ts']),

'Deployment - ORM y reservas': ('''# Deployment · ORM y reservas

## Modelos Prisma

| Deployment | Tipo y uso |
| --- | --- |
| id | String @id, default uuid |
| projectId | Int, FK Project con onDelete Cascade |
| composePath | String, ruta del YAML generado tras preparación |
| status | DeploymentStatus, default pending |
| createdAt | DateTime, default now |
| startedAt / finishedAt | DateTime opcionales |
| services | Relación DeploymentService[] |

Índice compuesto projectId/createdAt. No existe una restricción de un único deployment activo por proyecto o por archivo.

| DeploymentService | Tipo y uso |
| --- | --- |
| id | String @id sin default; ID observado de Docker |
| composeServiceName | String |
| port | Int, un puerto TCP observado o 0 |
| status / health | ContainerStatus / ContainerHealth |
| serviceType | ServiceType, default UNKNOWN |
| lastObservedAt | DateTime, default now |
| deploymentId | String FK Deployment con onDelete Cascade |

Índices deploymentId y status. Port no es unique y no tiene una restricción de rango declarada en el schema. La cascada de base de datos no detiene Docker ni libera Redis.

## Escrituras

La creación y arranque usan varias escrituras independientes: pending, composePath, building, starting/startedAt, createMany de servicios y running. Los servicios inicialmente quedan UNKNOWN. No hay una transacción que englobe ese recorrido.

La clasificación actualiza las filas de servicios en una transacción Prisma y vuelve a cargar el despliegue. La parada conserva los servicios y sus port, y escribe exited/none, lastObservedAt y stopped/finishedAt. La respuesta general mantiene esos port históricos; la consulta específica de puertos devuelve null cuando ya no considera activo el despliegue.

## Ciclo de reservas

```mermaid
flowchart TD
    A[Reserva provisional del formulario] -->|releasePort| B[Owner deployment:id:port:N]
    B -->|holdPort| C[Reserva Redis y socket TCP temporal]
    C -->|handoff| D[Socket cerrado; reserva Redis conservada]
    D -->|Docker up y list| E[Servicios observados]
    E -->|release owners temporales| F[restorePort con containerId]
    F -->|stop| G[releasePort por containerId]
```

Por cada TCP fijo del YAML final, libera primero `draftPortOwnerId(projectId, port)`. Después holdPort abre un socket TCP en 0.0.0.0 del entorno de la API y reserva el par de claves Redis:

```text
port-reservation:port:<N> → ownerId
port-reservation:owner:<ownerId> → N
```

El owner temporal es `deployment:<deploymentId>:port:<N>`. El hold tiene timeout predeterminado de 30 segundos; handoff cancela el timeout y cierra el socket para que Docker pueda publicar. No transfiere de forma atómica un socket a Docker. La disponibilidad comprobada pertenece al entorno de la API, que puede diferir del host del daemon.

Después de list libera todos los owners temporales y restaura solo servicios con port > 0, usando containerId. restorePort no prueba disponibilidad TCP porque Docker puede estar ocupando el puerto; registra el par Redis sin TTL, acepta el par idéntico y rechaza conflictos.

## Límites de consistencia

Un YAML puede publicar muchos puertos, pero runtime.list y DeploymentService conservan uno por servicio. Tras liberar los holds, solo los puertos observados y transferidos quedan reservados por containerId. UDP no participa. Publicaciones asignadas por Docker se registran después del arranque.

Clasificar puede actualizar el port ORM sin actualizar su reserva Redis. No hay monitor periódico que sincronice cambios externos de Docker. Startup reconstruye reservas de servicios guardados running/paused/restarting con port > 0; no comprueba Docker. Ver [[Startup - ORM y Redis]].

La liberación devuelve boolean, pero desplegar y detener no exigen true. Un error Redis sí puede abortar el caso de uso. Una falla tardía puede dejar registros, archivos o recursos pendientes aunque se intente compensar. El estado failed no implica limpieza completa.
''', ['prisma/models/deployment.prisma', 'src/deployment/application/use-cases/deploy-compose.use-case.ts', 'src/deployment/application/use-cases/classify-deployment-services.use-case.ts', 'src/ports/application/port-reservation.port.ts', 'src/ports/application/draft-port-owner.ts', 'src/ports/infrastructure/reservations/redis-port-reservation.service.ts', 'src/startup/restore-deployment-port-reservations.service.ts']),

'Deployment - Endpoints': ('''# Deployment · endpoints

Todos los métodos de DeploymentController y ProjectDeploymentController usan JwtAuthGuard. Autenticación mediante cookie access_token o Bearer JWT. Solo descubrimiento y despliegue reciben request.user.id; listar, detener, clasificar y consultar puertos operan con el ID recibido y no comprueban pertenencia del recurso al usuario. Autenticar no equivale a validar propiedad del proyecto.

## Rutas

| Método y ruta | Parámetros | Resultado data | Éxito esperado |
| --- | --- | --- | --- |
| POST /deployment/docker_files | Body projectId number | clonedRepositoryPaths, dockerFilesPath, composeAnalyses con variables y puertos | 201 |
| POST /project/init | Body projectId number | clonedRepositoryPaths, dockerComposePaths, composeAnalyses sin puertos | 201 |
| POST /deployment | DeployComposeRequest | DeploymentResponse | 201 |
| GET /deployment/project/:projectId | projectId con ParseIntPipe | DeploymentResponse[] ordenados createdAt desc | 200 |
| GET /deployment/:deploymentId/ports | deploymentId string | DeploymentPortsResponse | 200 |
| POST /deployment/:deploymentId/classify | deploymentId string; sin body utilizado | DeploymentResponse actualizado | 201 |
| POST /deployment/:deploymentId/stop | deploymentId string; sin body utilizado | DeploymentResponse detenido | 201 |

Son estados inferidos de decoradores, sin verificación HTTP en vivo. docker_files, init y stop declaran 200 en Swagger pero no tienen HttpCode: mantienen el 201 predeterminado de POST. IDs de despliegue se describen como UUID en Swagger, pero no usan ParseUUIDPipe.

Las dos rutas de análisis se implementan aquí y delegan en ProjectAnalysisService. Su comportamiento detallado está en [[Analisis - Endpoints]]. No crean Deployment ni llaman a up.

## Body para desplegar

| Campo | Tipo esperado | Uso |
| --- | --- | --- |
| projectId | number, requerido | Proyecto cuyos repositorios se revisan |
| composePath | string, requerido | Ruta del backend que debe coincidir con un candidato descubierto |
| environment | Array opcional de {service?: string, key: string, value: string} | Sobrescribir o agregar variables |
| ports | Array opcional ComposePort | Modificar mappings existentes |
| mirrorPorts | boolean opcional | Adaptar también target y listener; default funcional false |

ComposePort usa service string, hostIp string/null, publishedPort string/null, targetPort string, protocol string y mappingType one-to-one/range. Para desplegar el preparador admite protocol tcp/udp; mappingType no controla su validación. Debe conservarse la identidad del mapping original.

Los DTO solo agregan metadatos Swagger. main no configura ValidationPipe; no hay validación automática integral del body. Las comprobaciones de variables, servicios y puertos las realiza el preparador. No se debe interpretar ApiProperty como validación ejecutable.

## Respuesta del despliegue

```json
{
  "success": true,
  "data": {
    "id": "uuid-del-despliegue",
    "projectId": 12,
    "composePath": "/app/.neoglito/deployments/.neoglito-uuid-del-despliegue.compose.yml",
    "status": "running",
    "createdAt": "2026-10-10T06:00:00.000Z",
    "startedAt": "2026-10-10T06:00:02.000Z",
    "finishedAt": null,
    "services": [{
      "id": "id-docker",
      "composeServiceName": "api",
      "port": 8080,
      "status": "running",
      "health": "none",
      "serviceType": "UNKNOWN",
      "lastObservedAt": "2026-10-10T06:00:02.000Z",
      "deploymentId": "uuid-del-despliegue"
    }]
  },
  "error": null,
  "meta": null
}
```

IDs ilustrativos, no UUIDs reales para enviar. Las fechas son ISO. El envelope lo agrega ApiResponseInterceptor. Listar devuelve estos objetos en data array; stop/classify devuelven un objeto. No hay GET de detalle general ni endpoint de borrado o reinicio en este controlador.

## Consulta de puertos

data incluye deploymentId, projectId, status, sourceComposePath, projectDirectory y services con containerId, composeServiceName, port number/null.

Solo building/starting/running se consideran activos. Para esos estados lee procedencia desde el YAML y devuelve port si es > 0. Fuera de ellos devuelve metadatos null y port null. No inspecciona Docker ni consulta Redis. En estados iniciales puede no haber filas de servicios todavía.

## Errores

| Estado | Casos del código |
| --- | --- |
| 400 | Ruta ajena al proyecto, YAML ilegible/servicios inválidos, variables/puertos/espejo inválidos, ParseIntPipe |
| 401 | JWT ausente, inválido o expirado |
| 404 | Proyecto o deployment inexistente; descubrimiento también puede fallar por conexión GitHub ausente |
| 409 | Clasificación sin servicios, IDs faltantes/no running, observación/inspección fallida o resultado incompleto |
| 500 | Errores no convertidos: reservas, Docker durante deploy/stop, lectura de metadatos, Prisma u otros |

ApiExceptionFilter mantiene el status de HttpException; para otros errores usa 500 y puede devolver Error.message. El body de error es `{success:false,data:null,error:{code,message},meta:null}`, con details cuando corresponde a una lista de mensajes. La compensación no cambia el código HTTP original por el mero hecho de guardar failed.
''', ['src/deployment/presentation/deployment.controller.ts', 'src/deployment/application/dto/deploy-compose.dto.ts', 'packages/shared/src/repository/requests/deploy-compose.request.ts', 'packages/shared/src/repository/responses/project-docker-files.response.ts', 'packages/shared/src/repository/responses/deployment.response.ts', 'src/deployment/application/use-cases/get-deployment-ports.use-case.ts', 'src/shared/presentation/interceptors/api-response.interceptor.ts', 'src/shared/presentation/filters/api-exception.filter.ts', 'src/main.ts']),

'Deployment - Uso y frontend': ('''# Deployment · uso y frontend

## Uso HTTP

1. Autenticarse y obtener cookie o JWT.
2. POST /deployment/docker_files con projectId para obtener candidatos, variables y mappings.
3. Elegir una ruta exacta del backend y completar configuración.
4. POST /deployment y conservar data.id.
5. POST /deployment/:id/classify si se necesitan categorías actualizadas.
6. GET /deployment/project/:projectId y GET /deployment/:id/ports para consultar registros.
7. POST /deployment/:id/stop para detener el proyecto generado.

Ejemplo con mapping previamente descubierto para api, target 3000 TCP y hostIp null:

```http
POST /deployment
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "projectId": 12,
  "composePath": "/app/repo/usuario/api/docker-compose.yml",
  "mirrorPorts": false,
  "environment": [{"service": "api", "key": "MODE", "value": "development"}],
  "ports": [{
    "service": "api", "hostIp": null,
    "publishedPort": "8080", "targetPort": "3000",
    "protocol": "tcp", "mappingType": "one-to-one"
  }]
}
```

El path pertenece al servidor. Si el Compose original no contiene ese mapping, la petición se rechaza. Con false la aplicación sigue escuchando en 3000 y Docker publica 8080. El servidor no exige una reserva provisional previa del formulario: intenta holdPort durante el despliegue.

## Construcción de la petición web

createDeploymentRequest filtra variables por dockerComposePath; incluye también filas sin ruta. Bloquea valores required vacíos tras trim, omite keys vacías y conserva los values suministrados. Filtra ports al archivo elegido, elimina metadatos de descubrimiento y convierte published vacío a null. Envía **mirrorPorts true**.

El filtro frontend normaliza separadores pero mantiene mayúsculas; difiere de la comparación backend. Required es una comprobación del formulario, no una regla automática del DTO backend.

## Botón Analizar

useProjectAnalysis toma un Compose seleccionado por repositorio y llama deployAndClassify para cada destino con ruta no vacía. Las solicitudes de repositorios se lanzan sin esperar a que termine el anterior.

deployAndClassify primero despliega. Si la respuesta falla, no clasifica. Si desplegar funciona, usa el ID recibido para clasificar. Si clasificar falla, conserva la respuesta del despliegue y añade classificationError; la UI mantiene los servicios visibles con ese mensaje. No detiene ni revierte el despliegue por ese fallo.

Tras resolver invalida consultas de reservas y asignaciones de puertos. Cerrar el análisis cambia el estado de la interfaz; no llama a stop. El nombre del botón representa un flujo que sí crea contenedores.

## Puertos asignados en el formulario

loadProjectDeploymentPorts lista deployments, filtra building/starting/running y consulta /ports para cada ID. Propaga fallos de consulta en lugar de asumir que los puertos están libres.

assignedDeploymentPort asocia sourceComposePath al archivo y nombre del servicio. Para archivos generados antiguos permite fallback por projectDirectory solo si hay un único candidato en ese directorio. Toma el deployment coincidente más reciente; no usa uno anterior para rellenar un puerto faltante del nuevo.

Solo infiere asignación si hay un único mapping TCP del servicio, mappingType one-to-one y un único puerto positivo guardado. No copia el único port ORM sobre varios mappings ni UDP. La consulta no constituye una observación en vivo de Docker.

deploymentService ofrece deploy, classify, deployAndClassify, listByProject y getPorts. No define un método stop; la parada sí está disponible en el backend para un consumidor HTTP.
''', ['apps/web/src/features/projects/deployment.service.ts', 'apps/web/src/features/projects/deployment-request.ts', 'apps/web/src/features/projects/deployment-assigned-ports.ts', 'apps/web/src/features/projects/hooks/use-project-analysis.ts', 'src/deployment/presentation/deployment.controller.ts']),

'Deployment - Configuracion diagnostico y pruebas': ('''# Deployment · configuración, diagnóstico y pruebas

## Configuración

| Elemento | Alcance |
| --- | --- |
| DEPLOYMENT_COMPOSE_DIRECTORY | Directorio generado; default .neoglito/deployments desde cwd |
| DATABASE_URL | Prisma/PostgreSQL para proyectos, deployments y servicios |
| REDIS_URL | Conexión de reservas; RedisConnection usa fallback redis://localhost:6379 |
| Docker CLI y daemon | Runtime requiere docker y docker compose disponibles |
| CONTAINER_PROBE_HOST | Clasificador; default 127.0.0.1, Compose de Neoglito usa fallback host.docker.internal |
| JWT_SECRET y sesión | Acceso a endpoints protegidos |

Las rutas de Compose y directorios originales deben seguir accesibles para consultar procedencia, clasificar y detener. El generador escribe datos de configuración, potencialmente credenciales; .gitignore y .dockerignore excluyen .neoglito. No existe limpieza automática de esos archivos en los casos de uso revisados.

## Diagnóstico

| Síntoma | Punto a revisar |
| --- | --- |
| Compose no pertenece al proyecto | projectId y ruta devuelta por descubrimiento |
| Variable duplicada | Solapamiento service/key entre filas globales y específicas |
| Puerto no pertenece al archivo | Coincidencia exacta targetPort/protocol/hostIp |
| Puerto publicado inválido | Número o rango concreto, sin interpolación |
| No se pudo reservar temporalmente | Socket TCP del entorno API, Redis y conflicto de owner |
| Fallo de listener en modo espejo | Soporte de PORT/comando, mappings individuales TCP |
| Down o classify apunta al proyecto inesperado | Archivo propio esperado, deploymentId y compatibilidad antigua |
| /ports falla en deployment activo | Archivo generado ausente/ilegible o YAML inválido |
| Deployment running pero servicio exited/unhealthy | No existe espera de readiness en deploy |
| Clasificación 409 inmediatamente después de desplegar | Servicios ausentes o todavía no running; no hay reintento automático |
| Clasificación UNKNOWN | Evidencia insuficiente/ambigua o herramienta catalogada UNKNOWN |
| Base, reservas y Docker difieren | Sin reconciliación periódica ni transacción distribuida |
| Stop devuelve failed con servicios todavía guardados running | Error en down, Redis o actualización posterior |
| Deploy nuevo usa la misma configuración del repositorio | Los archivos ya clonados no se actualizan automáticamente por descubrimiento |

Los logs distinguen [deployment:backend], [deployment:compose], [deployment:http] y [deployment:ui]. Registran selección, rutas, puertos y nombres de variables. Los logs mostrados aquí no incluyen sus valores, pero los YAML sí los contienen; errores de Docker pueden incluir stdout/stderr.

Las operaciones Compose no tienen timeout configurado en el runtime. No existe endpoint de cancelación de la solicitud. No hay bloqueo por proyecto, idempotency key ni validación de transiciones: solicitudes repetidas pueden crear deployments distintos y competir por los puertos.

## Pruebas existentes revisadas

| Archivo | Cobertura observada |
| --- | --- |
| deploy-compose.use-case.spec.ts | Servicio sin puerto, configuración real enviada, rechazo antes de Docker, conflicto de hold, compensación parcial y parada actual/antigua |
| yaml-deployment-compose.service.spec.ts | Procedencia, archivo independiente, variables scoped, literales, aislamiento, modo espejo, bind mounts, anchors, rangos/UDP y validación |
| classify-deployment-services.use-case.spec.ts | Proyecto propio, tipos y observaciones, worker sin puerto, cadena real de clasificación y rechazos sin escrituras parciales |
| get-deployment-ports.use-case.spec.ts | Consulta por ID, puertos/null y deployment inexistente |
| service-image-catalog.spec.ts | Normalización de imágenes, candidatos ambiguos y UNKNOWN explícito |
| frontend-deployment-request.spec.ts | Selección de archivo/servicio y valores required |
| frontend-deployment-classification.spec.ts | Secuencia deploy/classify y conservación del despliegue ante errores de clasificación |
| frontend-deployment-assigned-ports.spec.ts | Asignaciones actuales, fallos, compatibilidad y mappings ambiguos |

Se revisaron como evidencia; **no se ejecutaron durante esta documentación**. Mocks de runtime/Prisma/HTTP no demuestran conectividad o limpieza de recursos reales.

Una verificación de integración necesita un proyecto de prueba: descubrir, desplegar, contrastar archivo generado y datos guardados, clasificar, consultar puertos y detener. Revisar por separado efectos en Docker y Redis, porque stopped/failed en la base no prueba por sí solo la ausencia de recursos. No se realizó ese recorrido para redactar estas notas.
''', ['src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts', 'src/shared/infrastructure/cache/redis-connection.service.ts', '.gitignore', '.dockerignore', 'src/deployment/application/use-cases/deploy-compose.use-case.spec.ts', 'src/deployment/infrastructure/compose/yaml-deployment-compose.service.spec.ts', 'src/deployment/application/use-cases/classify-deployment-services.use-case.spec.ts', 'src/deployment/application/use-cases/get-deployment-ports.use-case.spec.ts', 'src/deployment/domain/services/service-image-catalog.spec.ts', 'test/frontend-deployment-request.spec.ts', 'test/frontend-deployment-classification.spec.ts', 'test/frontend-deployment-assigned-ports.spec.ts']),
}

vault = Path('C:/Users/Uriel-Galvan/Documents/neoglito/neoglito')
existing = {p.stem for p in vault.rglob('*.md')}
for title, (body, sources) in notes.items():
    for link in re.findall(r'\[\[([^\]]+)\]\]', body):
        assert link in notes or link in existing, (title, link)
    footer = '\n## Fuentes del código\n\n'
    for source in sources:
        file = repo / source
        assert file.is_file(), source
        footer += f'- [{source}]({file.as_uri()})\n'
    metadata = '---\ntags:\n  - neoglito\n  - deployment\n  - documentacion-tecnica\nfuncionalidad: deployment\nactualizado: 2026-10-10\n---\n\n'
    (out / f'{title}.md').write_text(metadata + body.strip() + '\n' + footer, encoding='utf-8')
print(f'{len(notes)} notas de deployment; enlaces y fuentes verificados.')
