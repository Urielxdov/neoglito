from pathlib import Path
import re

base = Path(__file__).resolve().parent
repo = base.parent.parent
out = base / 'Project'
out.mkdir(exist_ok=True)
vault = Path('C:/Users/Uriel-Galvan/Documents/neoglito/neoglito')
notes = {}

def note(title, body, sources):
    notes['Project - ' + title] = (body, sources)

note('Indice', '''# Project · documentación técnica

`ProjectModule` administra el nombre, descripción y consulta de proyectos. Cada proyecto agrupa repositorios y despliegues. El registro de repositorios, el análisis Compose y la ejecución Docker tienen implementaciones en otros módulos, aunque el frontend los presenta como un recorrido continuo.

Documentación inferida del código revisado el **10 de octubre de 2026**. No se ejecutaron peticiones, clones, migraciones ni pruebas de la aplicación para redactarla.

## Recorrido

1. [[Project - Flujo]]: creación, consulta, edición e inicialización desde la interfaz.
2. [[Project - Implementacion y contratos]]: módulos, entidades, inyección y casos de uso.
3. [[Project - ORM y relaciones]]: Prisma, consultas, relaciones y migraciones.
4. [[Project - Endpoints]]: rutas, parámetros, respuestas, autenticación y errores.
5. [[Project - Repositorios e inicializacion]]: vinculación, descubrimiento Compose y fallos parciales.
6. [[Project - Uso y frontend]]: hooks, estado, caché y validación.
7. [[Project - Diagnostico y pruebas]]: límites actuales, casos ilustrativos y verificación.

## Lectura esencial

La creación `POST /project/registry` es pública. El listado y la edición exigen JWT, pero no filtran ni verifican pertenencia por usuario: el modelo Project no tiene `userId`. El nombre es único globalmente. La actualización utiliza POST y responde **201** por defecto, aunque Swagger documenta 200.

[[Autenticacion - Indice]], [[Analisis - Indice]], [[Deployment - Indice]] y [[Ports - Indice]] desarrollan los módulos que intervienen después del registro del proyecto.
''', ['src/project/project.module.ts', 'src/project/presentation/project.controller.ts', 'prisma/models/project.prisma'])

note('Flujo', '''# Project · flujo

## Crear mediante la API

```mermaid
sequenceDiagram
    participant C as Cliente
    participant H as ProjectController
    participant U as CreateProjectUseCase
    participant R as PrismaProjectRepository
    participant DB as PostgreSQL
    C->>H: POST /project/registry {name, description}
    H->>U: CreateProjectRequest
    U->>U: trim y comprobar campos no vacíos
    U->>R: findByName(name)
    R->>DB: project.findUnique
    alt Nombre existente
        U-->>C: 409 Conflict
    else Nombre disponible
        U->>R: save(Project sin id)
        R->>DB: project.create
        DB-->>U: Proyecto persistido
        U-->>H: CreateProjectResponse con fechas ISO
        H-->>C: 201 y envoltura de éxito
    end
```

El registro no recibe repositorios ni identidad del usuario. Un consumidor de API puede crear un proyecto sin repositorios. Crear la entidad tampoco clona archivos, descubre Compose, reserva puertos ni arranca contenedores.

## Crear desde el frontend

`useProjectCreation` requiere repositorios seleccionados y coordina varios requests:

```mermaid
flowchart TD
    A[Selección y formulario] --> B[Crear Project]
    B --> C[Vincular repositorios uno por uno]
    C --> D[POST project/init]
    D --> E[Guardar rutas Compose en estado del frontend]
    E --> F[Abrir detalle y refrescar proyectos]
    B -->|Fallo| G[Mostrar error y detener recorrido]
    C -->|Fallo| H[Conservar proyecto y vínculos anteriores]
    D -->|Fallo| H
    H --> I[Mostrar error y refrescar listado]
```

No hay una transacción que abarque estas solicitudes ni rollback compensatorio. Si el proyecto se crea y falla el segundo vínculo, el proyecto y el primer vínculo permanecen. [[Project - Repositorios e inicializacion]] describe cómo continuar desde ese estado.

## Consultar

`GET /project` pasa por `JwtAuthGuard`, `GetProjectsUseCase` y `findAll`. Prisma incluye repositorios y ordena por `updatedAt` descendente. El caso de uso transforma fechas a ISO y el interceptor envuelve el array. No recibe `userId`, paginación ni filtro. Es una consulta a persistencia; no consulta GitHub ni Docker.

## Editar

1. El controlador parsea `:id` con `ParseIntPipe` y recibe ambos campos.
2. `UpdateProjectUseCase` recorta y valida nombre y descripción.
3. Busca el proyecto; si no existe, el adaptador lanza 404.
4. Busca el nombre y permite conservarlo si pertenece al mismo id; si pertenece a otro proyecto, lanza 409.
5. Guarda una entidad con el mismo id mediante `project.update`, que modifica nombre y descripción e incluye repositorios.
6. Devuelve el proyecto con fechas ISO y repositorios resumidos. Prisma administra el nuevo `updatedAt`.

La validación del cuerpo ocurre antes de comprobar existencia: un id inexistente y un nombre vacío producen 400, no 404. Las operaciones de lectura y escritura no se agrupan en una transacción, por lo que una modificación concurrente puede cambiar el resultado entre ambas.

Volver a [[Project - Indice]].
''', ['src/project/application/use-cases/create-project.use-case.ts', 'src/project/application/use-cases/get-projects.use-case.ts', 'src/project/application/use-cases/update-project.use-case.ts', 'apps/web/src/features/projects/hooks/use-project-creation.ts'])

note('Implementacion y contratos', '''# Project · implementación y contratos

## Inyección de dependencias

`AppModule` importa `ProjectModule`. Este importa `AuthModule` y `PrismaModule`, registra `ProjectController` y proporciona los tres casos de uso. El token `PROJECT_REPOSITORY = Symbol("PROJECT_REPOSITORY")` se asocia mediante `useClass` a `PrismaProjectRepository` y se exporta.

`RepositoryModule` importa ProjectModule para utilizar ese token al comprobar que existe el proyecto de un vínculo. ProjectModule no importa RepositoryModule: la dependencia entre módulos en ese recorrido va de Repository hacia Project.

```mermaid
flowchart LR
    C[ProjectController] --> A[CreateProjectUseCase]
    C --> B[GetProjectsUseCase]
    C --> D[UpdateProjectUseCase]
    A --> P[PROJECT_REPOSITORY]
    B --> P
    D --> P
    R[CreateRepositoryUseCase] --> P
    P --> I[PrismaProjectRepository]
    I --> S[PrismaService]
```

## Entidad de dominio

| Campo | Tipo | Significado |
|---|---|---|
| id | number o undefined | Undefined identifica una entidad nueva para `save` |
| name, description | string | Metadatos del proyecto |
| createdAt, updatedAt | Date | Fechas internas |
| repositories | ProjectRepositorySummary[] | Resúmenes `{id, name}`, por defecto array vacío |

El constructor asigna campos readonly, sin métodos, validación ni eventos. La entidad no contiene despliegues ni usuario, aunque Prisma tiene relación con Deployment.

## Contrato del repositorio

| Método | Retorno | Comportamiento del adaptador actual |
|---|---|---|
| save(project) | Promise de Project | Create si id es undefined; update en cualquier otro caso |
| findById(id) | Promise de Project | Lanza NotFoundException si falta |
| findByName(name) | Promise de Project o null | Consulta exacta por campo único |
| findAll() | Promise de Project[] | Incluye repositorios y ordena por updatedAt descendente |

La firma de `findById` no permite null: el consumidor depende de la excepción para el caso inexistente. El puerto también acopla indirectamente esa semántica HTTP porque el adaptador usa una excepción de Nest.

## Casos de uso y DTO

`CreateProjectUseCase.execute(request)` recibe la clase local `CreateProjectRequest`, con name y description readonly, compatible con el contrato compartido. `GetProjectsUseCase.execute()` no tiene parámetros. `UpdateProjectUseCase.execute(id, name, description)` recibe argumentos separados; no hay una clase request local para editar.

Los DTO implementan los tipos de `@neoglito/shared/repository` y solo usan `ApiProperty`. Estos decoradores describen Swagger; no validan tipos durante el request. Tampoco existe ValidationPipe global en main. La validación efectiva está en los casos de uso mediante `request.name?.trim()` y `description?.trim()`.

Esto detecta null, undefined, vacío y espacios; un número u objeto no garantiza 400 porque puede provocar un TypeError al llamar trim. No hay límite de longitud, regex de nombre ni conversión automática de valores.

## Respuestas

`CreateProjectResponse` tiene id, name, description, createdAt y updatedAt. `ProjectResponse` añade repositories con `{id, name}`. No contiene cloneUrl, gitUrl ni estados Docker. Las fechas públicas son strings ISO; las internas son Date.

Los casos de uso verifican que el repositorio devolvió un id. Si falta, lanzan Error, que el filtro global traduce a 500. Los contratos compartidos se ubican en `packages/shared/src/repository`, aun siendo contratos de proyectos.

Volver a [[Project - Indice]].
''', ['src/project/project.module.ts', 'src/project/domain/entities/project.entity.ts', 'src/project/domain/entities/project.repository.ts', 'src/project/application/dto/create-project.dto.ts', 'src/project/application/dto/update-project.dto.ts', 'src/repository/repository.module.ts', 'packages/shared/src/repository/responses/project.response.ts', 'src/main.ts'])

note('ORM y relaciones', '''# Project · ORM y relaciones

## Modelo actual

```prisma
model Project {
  id           Int          @id @default(autoincrement())
  name         String       @unique
  description  String
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  repositories Repository[]
  deployments  Deployment[]
}
```

La fuente del modelo es `prisma/models/project.prisma`. El datasource declara PostgreSQL. Project no tiene `userId`, propietario, estado activo ni ruta de clonación. El id es numérico autoincremental; los despliegues tienen identificadores UUID separados.

```mermaid
erDiagram
    Project }o--o{ Repository : agrupa
    Project ||--o{ Deployment : tiene
    Deployment ||--o{ DeploymentService : contiene
    Project {
        int id PK
        string name UK
        string description
        datetime createdAt
        datetime updatedAt
    }
    Repository {
        int id PK
        string name
        string gitUrl
        string cloneUrl UK
    }
    Deployment {
        string id PK
        int projectId FK
        string status
    }
```

Repository declara `projects Project[]`, de modo que el esquema actual expresa muchos a muchos implícitos: un repositorio puede estar en varios proyectos. Su id se suministra desde el registro, no se autogenera en el modelo actual. `cloneUrl` es único globalmente.

Deployment posee `projectId` con eliminación en cascada. Eso expresa una acción de base de datos; no supone ejecutar Docker down, liberar Redis ni borrar clones. Project no ofrece endpoint de eliminación.

## Consultas del adaptador

| Operación | Prisma | Relaciones incluidas |
|---|---|---|
| Guardar entidad nueva | project.create con name, description y ambas fechas | Ninguna |
| Guardar entidad con id | project.update where id, data name y description | repositories: true |
| Buscar id | project.findUnique where id | Ninguna |
| Buscar nombre | project.findUnique where name | Ninguna |
| Listar | project.findMany, orderBy updatedAt desc | repositories: true |

`toDomain` transforma los repositorios incluidos a `{id, name}`. Si no se incluyeron, asigna `[]`. Por ello `findById` y `findByName` devuelven una entidad con array vacío aunque existan vínculos; no sirve inferir ausencia de repositorios a partir de esas consultas. Listado y actualización sí devuelven vínculos.

El create escribe explícitamente el mismo `new Date()` para createdAt y updatedAt. En el update, las fechas del objeto de dominio no se envían: `createdAt` permanece y `@updatedAt` gestiona el timestamp de la modificación. Asociar un repositorio mediante Repository no actualiza explícitamente Project.updatedAt; no debe interpretarse el orden del listado como actividad de despliegues o cambios en vínculos.

## Unicidad y concurrencia

El caso de uso consulta primero el nombre para ofrecer 409. El índice único sigue siendo la garantía final. Dos requests pueden leer que no existe y competir en create; el adaptador no traduce el error de unicidad de Prisma a ConflictException, así que la carrera puede terminar en 500.

La búsqueda no aplica lowerCase ni modo insensible a mayúsculas. La interfaz compara trim y lowerCase, mientras que backend consulta la cadena recortada. No debe asumir que la validación visual y la igualdad de la base de datos son idénticas.

## Diferencia con migraciones versionadas

La migración inicial `20260922132357` crea Repository con projectId, sshPrivateKey y otros campos históricos, con relación uno a muchos y unicidad `(projectId, cloneUrl)`. El esquema actual declara name, gitUrl y relación muchos a muchos, con cloneUrl único.

En las migraciones SQL revisadas no se encontró la conversión que crea la relación implícita muchos a muchos ni estos cambios de Repository. Es una diferencia entre archivos versionados, **no una comprobación de la base de datos instalada**. No se ejecutó migrate, db push ni introspección. Si un entorno construido solo con esas migraciones falla al incluir repositorios, comprobar primero esa diferencia y el cliente generado.

Volver a [[Project - Indice]].
''', ['prisma/models/project.prisma', 'prisma/models/repository.prisma', 'prisma/models/deployment.prisma', 'prisma/schema.prisma', 'prisma/migrations/20260922132357/migration.sql', 'src/project/infrastructure/persistence/prisma-project.repository.ts'])

note('Endpoints', '''# Project · endpoints

Las rutas no tienen prefijo global. Los ejemplos usan `http://localhost:3000`; el puerto real depende de PORT. Swagger se publica en `/docs`.

## Mapa

| Método y ruta | JWT | Parámetros | Éxito real | Implementación |
|---|---|---|---|---|
| POST /project/registry | No | JSON name, description | 201 | ProjectController |
| GET /project | Sí | Ninguno | 200 | ProjectController |
| POST /project/:id/update | Sí | id en ruta; JSON name, description | 201 | ProjectController |
| POST /project/init | Sí | JSON projectId | 201 | ProjectDeploymentController, en Deployment |

No hay GET por id, PATCH, PUT, DELETE ni paginación en ProjectController. Swagger describe actualización e inicialización como 200, pero no hay `@HttpCode(200)`: los POST conservan el 201 predeterminado.

## Crear

```http
POST /project/registry
Content-Type: application/json

{"name":"Tienda","description":"Backend y frontend del catálogo"}
```

Ambos campos son obligatorios y se recortan. Una cadena con solo espacios es inválida. El cuerpo no acepta repositorios como parte del contrato; no los vincula aunque el cliente añada otras propiedades. No se exige JWT en este método ni en toda la clase, y no hay guard global registrado en AppModule.

Ejemplo ilustrativo de respuesta:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Tienda",
    "description": "Backend y frontend del catálogo",
    "createdAt": "2026-10-10T12:00:00.000Z",
    "updatedAt": "2026-10-10T12:00:00.000Z"
  },
  "error": null,
  "meta": null
}
```

## Listar

```http
GET /project
Authorization: Bearer <JWT>
```

Devuelve `data: ProjectResponse[]`; si no hay registros, `[]`. Cada elemento tiene los campos de creación y `repositories: [{"id":123,"name":"organizacion/backend"}]`. El orden es updatedAt descendente; no hay orden secundario declarado ni orden explícito de repositorios.

El guard autentica pero el método no recibe request ni userId. Pese a los textos de Swagger sobre proyectos del usuario, el repositorio consulta todos los proyectos. No hay filtro de autorización por propietario.

## Actualizar

```http
POST /project/1/update
Authorization: Bearer <JWT>
Content-Type: application/json

{"name":"Tienda principal","description":"Servicios del catálogo"}
```

`:id` usa ParseIntPipe. Un texto no numérico produce 400. No hay validación explícita de id positivo; un entero sin proyecto termina en 404. Los dos campos deben enviarse: no es una actualización parcial. La respuesta es ProjectResponse, incluyendo repositorios. Conservar el mismo nombre se permite para el propio id. No modifica vínculos ni contenedores.

## Inicialización delegada

`POST /project/init`, body `{"projectId":1}`, llama `ProjectAnalysisService.analyzeProject(request.user.id, projectId, {includePorts:false})`. Devuelve `clonedRepositoryPaths`, `dockerComposePaths` y `composeAnalyses` con dockerComposePath y environmentVariables. No incluye puertos en esos análisis ni crea Deployment. El userId se usa para acceso al clonador, no para comprobar propietario del proyecto.

Consultar [[Analisis - Endpoints]] y [[Project - Repositorios e inicializacion]] para los detalles. La implementación y el DTO están en Deployment, aunque la URL empieza por project.

## Autenticación y errores

El guard admite cookie `access_token` o Bearer; véase [[Autenticacion - JWT cookie y cifrado]]. El frontend usa credentials include. No hay una comprobación adicional de autorización por proyecto en estos casos de uso.

| Estado | Causa |
|---|---|
| 400 | Campos vacíos/ausentes o id de ruta no parseable |
| 401 | JWT inválido o ausente en rutas protegidas |
| 404 | Proyecto inexistente al editar; proyecto inexistente en init |
| 409 | Nombre ya existente detectado antes de guardar |
| 500 | Error Prisma, carrera de unicidad no traducida, tipo incorrecto al usar trim o id ausente en respuesta interna |

La envoltura de error global usa `success:false`, `data:null`, `error:{code,message}` y `meta:null`. Los errores de Nest pueden incluir details si traen una lista de mensajes. No se aplica ValidationPipe ni validación runtime basada en las interfaces TypeScript.

Volver a [[Project - Indice]].
''', ['src/project/presentation/project.controller.ts', 'src/deployment/presentation/deployment.controller.ts', 'src/main.ts', 'src/app.module.ts', 'src/shared/presentation/interceptors/api-response.interceptor.ts', 'src/shared/presentation/filters/api-exception.filter.ts'])

note('Repositorios e inicializacion', '''# Project · repositorios e inicialización

## Vincular un repositorio

ProjectController no contiene endpoints de vínculo. El frontend usa `repositoryService.create` para `POST /repository/registry` con projectId, id, name, gitUrl y cloneUrl. Ese método tampoco tiene guard JWT.

`CreateRepositoryUseCase` valida ids enteros positivos y cadenas recortadas no vacías, consulta `PROJECT_REPOSITORY.findById` y comprueba si ese cloneUrl ya está asociado al proyecto. Si ya lo está, devuelve 409.

El adaptador de Repository realiza upsert por id, actualiza metadatos y hace `projects.connect` con el proyecto recibido. Connect agrega la asociación; no sustituye todos los proyectos previos. Un mismo repositorio puede compartirse entre proyectos. Una colisión de cloneUrl con un id distinto puede causar un error de unicidad no traducido por ese caso de uso.

Los ids y URLs enviados se persisten; ese registro no consulta GitHub para demostrar pertenencia. La lista GitHub y el clonador son operaciones distintas. Véase [[Analisis - ORM y archivos]].

## Inicializar

Tras vincular secuencialmente los repositorios seleccionados, `useProjectCreation` llama `projectService.init({projectId})`. El controlador ubicado en Deployment delega a ProjectAnalysisService:

1. Carga el proyecto con repositorios desde Prisma; si no existe, 404.
2. Clona o reutiliza cada repositorio asociado, usando la identidad autenticada para el acceso GitHub.
3. Busca archivos `docker-compose*.yml` bajo las carpetas clonadas.
4. Analiza variables de entorno; con includePorts false evita extraer puertos.
5. Retorna resultados adaptados a InitProjectResponse; no escribe un estado “inicializado” en Project.

Un proyecto sin repositorios puede producir arrays vacíos. Un resultado exitoso sin Compose tampoco implica un despliegue utilizable. La búsqueda no equivale a validar Docker Compose completo. [[Analisis - Flujo]] y [[Analisis - Variables y puertos]] detallan las restricciones del descubrimiento y extracción.

El frontend de creación utiliza rutas clonadas y rutas Compose para llenar candidatos y elegir la primera ruta por repositorio. No utiliza en ese hook las environmentVariables que devuelve init. Al abrir posteriormente el proyecto, se usa el análisis completo y se cargan variables y puertos.

## Abrir un proyecto

`useProjectOpen` establece openId, busca el proyecto en la caché y llama `projectService.environmentVariables`. A pesar del nombre, ese método es un alias de `dockerFilesPath` y solicita `POST /deployment/docker_files`, que retorna rutas, análisis de variables y puertos.

Los repositorios usados para asociar las rutas en este hook se obtienen de la intersección de los ids vinculados y el listado de repositorios GitHub disponible. Un repositorio vinculado ausente de ese listado puede aparecer en el resumen mediante fallback, pero no recibe esas asignaciones desde este hook.

Los helpers relacionan repositorios con clones por basename y nombre corto en minúsculas. Luego seleccionan archivos por prefijo de ruta normalizada con `/`. No se transporta un vínculo explícito repositoryId→ruta desde el backend; dos repositorios con el mismo nombre corto pueden asociarse incorrectamente. Los candidatos preservan el orden recibido y se elige el primero, sin una regla de preferencia por entorno.

## Persistencia y fallos parciales

| Punto de fallo | Qué puede permanecer | Comportamiento del hook |
|---|---|---|
| Create Project | Si falla antes de persistir, nada nuevo | Mostrar error y finalizar |
| Vínculo número N | Proyecto y vínculos anteriores | Detener vínculos posteriores, refrescar listado |
| Init/análisis | Proyecto, vínculos y clones ya creados | Mostrar error y refrescar listado |
| Clasificación después de desplegar | Deployment y contenedores ya creados | La interfaz conserva el despliegue y reporta fallo de clasificación |

No hay rollback de requests anteriores ni cancelación automática de clones ya iniciados. La interfaz conserva formulario y selección cuando el recorrido falla. Reenviar el registro completo con el mismo nombre puede recibir 409 porque el proyecto ya existe. El endpoint update no completa vínculos pendientes; deben registrarse los faltantes usando el id existente y luego repetir init si procede.

## De Project a Deployment

`useProjectAnalysis.startAnalysis` toma el proyecto activo, repositorios y configuración Compose del estado. Para cada repositorio con ruta no vacía crea un request de despliegue y llama deployAndClassify. Las tareas se lanzan sin esperar una a otra. Entrar en la fase visual analyze puede iniciar contenedores: no es únicamente lectura de YAML.

Cerrar esa vista modifica estado de interfaz, no detiene Docker. Los resultados persistidos, reservas y parada pertenecen a [[Deployment - Flujo y estados]] y [[Ports - Reservas ciclo completo]].

Volver a [[Project - Indice]].
''', ['src/repository/application/use-cases/repository/create-repository.use-case.ts', 'src/repository/infrastructure/persistence/prisma-repository.repository.ts', 'src/repository/presentation/repository.controller.ts', 'src/analisys/application/project-analysis.service.ts', 'src/deployment/presentation/deployment.controller.ts', 'apps/web/src/features/projects/hooks/use-project-creation.ts', 'apps/web/src/features/projects/hooks/use-project-open.ts', 'apps/web/src/features/projects/hooks/use-project-analysis.ts', 'apps/web/src/features/projects/compose.helpers.ts'])

note('Uso y frontend', '''# Project · uso y frontend

## Servicio HTTP

| Método projectService | Request |
|---|---|
| getAll() | GET /project |
| create({name, description}) | POST /project/registry |
| update(id, {name, description}) | POST /project/:id/update |
| init({projectId}) | POST /project/init |
| dockerFilesPath({projectId}) | POST /deployment/docker_files |
| environmentVariables({projectId}) | Mismo endpoint y respuesta que dockerFilesPath |

`apiClient` usa VITE_API_URL o localhost:3000, JSON en POST y credentials include. Convierte fallos de red a una respuesta con NETWORK_ERROR. Los hooks comprueban `response.success` y presencia de data. El cliente consume la envoltura del backend, no el proyecto desnudo.

## Datos del servidor y estado visual

`useProjects` mantiene una query con clave `['projects']`. Su queryFn solicita el listado, lanza Error si la respuesta falla y aplica `toProject`, que convierte fechas ISO en Date. Retorna array vacío si no tiene data, flags de carga/error y refresh mediante refetch. No define polling, staleTime, gcTime ni políticas de retry propias; se aplican las opciones de React Query del entorno.

ProjectsProvider contiene un reducer distinto para la navegación y los formularios. No almacena el listado de proyectos en ese reducer ni persiste explícitamente sus campos en localStorage.

| Estado | Uso |
|---|---|
| phase: list/detail/analyze | Pantalla activa |
| openId | Proyecto del modal/resumen |
| activeId | Proyecto del detalle o análisis |
| creating, newName, newDescription | Formulario de creación |
| submitting, progress | Recorrido de creación en curso |
| detailTab | deploy, routes, repos o general |
| editName, editDescription | Valores editados; null usa el valor actual |
| editSubmitting, editSaved, editMessage | Resultado de edición |
| panelError | Error del panel o inicialización |

`project-opened` solo establece openId. `detail-opened` cambia phase a detail, establece activeId, cierra openId y reinicia edición. `creation-succeeded` limpia el formulario y abre detail con el nuevo id. Salir de analyze vuelve a detail y pestaña deploy. Cerrar detalle no envía una parada de contenedores.

## Validación de creación

`useProjectCreationStatus` permite crear si nombre y descripción tienen contenido tras trim, el nombre no está tomado, hay al menos un repositorio seleccionado y no hay envío activo. `isProjectNameTaken` compara nombres recortados en minúsculas sobre los proyectos cargados.

Existe `createProjectSchema` Zod con nombre de 1 a 100 caracteres y descripción de 1 a 500, ambos recortados. `useProjects.createProject` aplica ese esquema antes de llamar al servicio. Sin embargo, el recorrido visible `useProjectCreation.handleCreateProject` llama directamente a `projectService.create`, por lo que no pasa por esa mutación Zod. No debe atribuirse ese límite a todas las rutas del frontend ni al backend.

La mutación genérica tampoco comprueba success ni refresca proyectos por sí misma: retorna el resultado del servicio. El recorrido de creación y edición realizan explícitamente su refresh.

## Progreso de creación

Para N repositorios se usa total N+2: crear Project, registrar N vínculos y buscar Compose. Se muestran etiquetas por paso; no representa porcentaje real de bytes de clonación ni tiempo restante. El último paso de init se marca antes de realizar el request y el progreso desaparece al completar.

Un fallo de vínculos o init llama creation-failed, que desactiva submitting y limpia progress, conservando datos del formulario. Éxito limpia campos, selección de repositorios y abre el detalle, luego refresca el listado.

## Edición

`useProjectEditing` obtiene valores del reducer o del proyecto activo. Bloquea guardar si no hay proyecto, si ambos valores son exactamente iguales a los existentes, si el nombre coincide con otro proyecto o si falta contenido. La comprobación de igualdad ocurre antes del trim del payload: agregar espacios puede habilitar guardar aunque el servidor persista el mismo contenido recortado.

Envía ambos campos al servicio. En error conserva valores y muestra editMessage. En éxito limpia overrides, marca editSaved y refresca proyectos. El hook no comprueba editSubmitting dentro de su condición inicial; el estado se usa para informar a la UI. El servicio no modifica directamente la caché con la respuesta.

## Repositorios y configuración Compose

Los selectores combinan los resúmenes persistidos con la lista GitHub. Para detalle, si falta el repositorio remoto, usan el nombre persistido y etiquetas desconocidas. El conteo de proyectos por repositorio se calcula con el listado de proyectos cargado.

Variables y puertos se guardan en DeploysProvider, usando claves projectId:repositoryId. Los helpers preservan dockerComposePath por fila para seleccionar la configuración del archivo apropiado. Valores literales usan value, interpolaciones usan defaultValue y se consideran requeridas si no tienen default. Estas reglas no ejecutan expansión real de variables Compose.

Volver a [[Project - Indice]].
''', ['apps/web/src/features/projects/project.service.ts', 'apps/web/src/shared/api/client.ts', 'apps/web/src/features/projects/hooks/use-projects.ts', 'apps/web/src/features/projects/project.mapper.ts', 'apps/web/src/features/projects/projects.reducer.ts', 'apps/web/src/features/projects/projects.context.tsx', 'apps/web/src/features/projects/create-project.schema.ts', 'apps/web/src/features/projects/hooks/use-project-selectors.ts', 'apps/web/src/features/projects/hooks/use-project-editing.ts', 'apps/web/src/features/repositories/repository-selection.helpers.ts', 'apps/web/src/features/projects/compose.helpers.ts'])

note('Diagnostico y pruebas', '''# Project · diagnóstico y pruebas

## Diagnóstico por síntoma

| Síntoma | Explicación según código | Qué revisar |
|---|---|---|
| Un usuario ve proyectos creados por otro | El listado no filtra usuario y Project no tiene propietario | GetProjectsUseCase y findAll |
| Se puede crear sin sesión | registry no aplica guard | Decoradores de ProjectController |
| La edición devuelve 201 | POST sin HttpCode, Swagger indica 200 | Contrato HTTP documentado |
| Un nombre vacío devuelve 400 | trim y validación en caso de uso | Campos enviados |
| Un campo numérico devuelve 500 | Tipo runtime no validado antes de trim | DTO, ausencia de ValidationPipe |
| Nombre disponible termina en error al crear | Carrera o índice único de base de datos | Requests concurrentes y error Prisma |
| La UI rechaza una variante de mayúsculas | Comparación lowerCase de nombres cargados | Diferencia con consulta exacta del backend |
| Proyecto sin repositorios tras un fallo | Create y vínculos son requests separados | Qué vínculos llegaron a persistirse |
| Proyecto existente tras fallo de init | No hay rollback de creación | Usar id existente para completar recorrido |
| findById retorna repositories vacío | No usa include; toDomain rellena [] | No confundir proyección con ausencia de vínculos |
| No se encuentran Compose | Patrón de archivos, clones o permisos de GitHub | Documentación de Analisis |
| Las relaciones fallan en un entorno nuevo | Migraciones históricas difieren del modelo actual | Esquema aplicado y cliente generado |
| Cerrar detalle/análisis no apaga servicios | Solo cambia estado del frontend | Operación stop de Deployment |

## Casos ilustrativos

1. **Crear con espacios:** name `"  Tienda  "` y description `"  Catálogo  "` se persisten como Tienda y Catálogo; respuesta 201 sin repositories.
2. **Editar conservando nombre:** buscar el mismo nombre encuentra el mismo id, por lo que la condición de conflicto no se cumple. Se guarda la descripción y se devuelven repositorios incluidos.
3. **Editar un id inexistente con cuerpo válido:** findById lanza 404 y no se intenta save.
4. **Editar un id inexistente con cuerpo vacío:** falla primero la validación; devuelve 400.
5. **API frente a UI:** la API permite un proyecto sin repositorios; la UI exige al menos uno seleccionado para habilitar creación.
6. **Fallo en vínculo intermedio:** tras crear y vincular A, falla B. No se intenta C ni init; el proyecto y A permanecen, se muestra el error y se refresca el listado.
7. **Repetir el formulario anterior:** el nombre ya existe, así que crear de nuevo puede producir 409. No es una reanudación automática.
8. **Sin archivos Compose:** init puede retornar éxito con arrays vacíos; eso no indica que haya contenedores ejecutándose.

Estos casos describen ramas del código; no son resultados de peticiones ejecutadas en el entorno.

## Configuración relacionada

Project no define variables de entorno propias. Depende de Prisma y DATABASE_URL para PostgreSQL; las rutas protegidas dependen de JWT. El cliente usa VITE_API_URL; CORS depende de FRONTEND_URL. La inicialización necesita credenciales GitHub y acceso a archivos según [[Autenticacion - Configuracion y diagnostico]] y [[Analisis - Diagnostico y pruebas]]. El arranque general comprueba Docker aunque una operación de metadatos Project no lo utilice directamente; véase [[Startup - Flujo]].

## Pruebas existentes y límites de verificación

No se encontraron specs dedicados en src/project para CreateProjectUseCase, GetProjectsUseCase, UpdateProjectUseCase, ProjectController o PrismaProjectRepository. Existen pruebas relacionadas de ProjectAnalysisService y de componentes/servicios del recorrido de Deployment en test, incluyendo frontend-deployment-request, frontend-deployment-assigned-ports y frontend-deployment-classification. Cubren piezas relacionadas, no equivalen a comprobar el CRUD de Project ni el recorrido completo create→link→init.

Para futuras pruebas, los comportamientos relevantes son el nombre duplicado, validación runtime, orden de errores, preservación de vínculos al editar, carrera de unicidad, autenticación por ruta y recuperación ante fallos parciales. No se añadieron ni ejecutaron pruebas de aplicación para esta documentación.

La verificación realizada se limita a leer fuentes locales, comprobar enlaces de notas y rutas de fuentes, validar bloques Markdown y comparar los archivos publicados con los generados. No confirma estado real de PostgreSQL, acceso GitHub ni funcionamiento de Docker.

Volver a [[Project - Indice]].
''', ['src/project/application/use-cases/create-project.use-case.ts', 'src/project/application/use-cases/update-project.use-case.ts', 'src/project/infrastructure/persistence/prisma-project.repository.ts', 'apps/web/src/features/projects/hooks/use-project-creation.ts', 'src/analisys/application/project-analysis.service.spec.ts', 'test/frontend-deployment-request.spec.ts', 'test/frontend-deployment-assigned-ports.spec.ts', 'test/frontend-deployment-classification.spec.ts'])

known = set(notes) | {p.stem for p in vault.rglob('*.md')}
for title, (body, sources) in notes.items():
    assert body.count('```') % 2 == 0, title
    for target in re.findall(r'\[\[([^\]|]+)', body):
        assert target in known, (title, target)
    for source in sources:
        assert (repo / source).is_file(), source
    front = '---\ntags:\n  - neoglito\n  - project\n  - documentacion-tecnica\nfuncionalidad: Project\nactualizado: 2026-10-10\n---\n\n'
    footer = '\n## Fuentes del código\n\n' + '\n'.join(f'- [{source}]({(repo / source).as_uri()})' for source in sources) + '\n'
    (out / (title + '.md')).write_text(front + body + footer, encoding='utf-8')
print(f'{len(notes)} notas generadas y verificadas en {out}')
