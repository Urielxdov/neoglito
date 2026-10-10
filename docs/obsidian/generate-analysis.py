from pathlib import Path
import re

base = Path(__file__).resolve().parent
repo = base.parent.parent
out = base / 'Analisis'
out.mkdir(exist_ok=True)

notes = {
'Analisis - Indice': ('''# Análisis · documentación técnica

`AnalysisModule`, ubicado en `src/analisys` (nombre real de la carpeta), concentra el descubrimiento de archivos Docker Compose y la extracción de sus variables de entorno y puertos. Exporta `ProjectAnalysisService` para los consumidores del módulo de despliegues.

Documentación inferida del código revisado el **10 de octubre de 2026**. Los ejemplos son ilustrativos; no son respuestas obtenidas de infraestructura activa.

## Recorrido de lectura

1. [[Analisis - Flujo]]: consulta, clonación, descubrimiento y extracción.
2. [[Analisis - Implementacion y contratos]]: módulo, servicio, métodos e inyección.
3. [[Analisis - ORM y archivos]]: modelos consultados, clones y búsqueda recursiva.
4. [[Analisis - Variables y puertos]]: reglas de extracción, ejemplos y límites.
5. [[Analisis - Endpoints]]: autenticación, parámetros, respuestas y errores.
6. [[Analisis - Uso y frontend]]: consumo interno, apertura de proyectos y botón Analizar.
7. [[Analisis - Diagnostico y pruebas]]: requisitos, fallos y cobertura existente.

## Responsabilidad y efectos

El análisis consulta PostgreSQL y puede clonar repositorios en disco. No guarda los resultados del análisis en una tabla, no reserva puertos y no inicia contenedores por sí mismo. La respuesta describe las declaraciones del YAML; no certifica que Docker pueda ejecutarlo.

La interfaz también llama «Analizar» a un flujo que **despliega y clasifica contenedores**. Su estado se encuentra en `apps/web/src/features/analysis`. Esa interacción se explica en [[Analisis - Uso y frontend]] para distinguir sus efectos de los del servicio backend.
''', ['src/analisys/analysis.module.ts', 'src/analisys/application/project-analysis.service.ts', 'apps/web/src/features/projects/hooks/use-project-analysis.ts']),

'Analisis - Flujo': ('''# Análisis · flujo

```mermaid
sequenceDiagram
    participant C as Consumidor autenticado
    participant A as ProjectAnalysisService
    participant P as Prisma
    participant G as CloneRepositoryUseCase
    participant F as FileFinderPort
    participant E as Extractores YAML
    C->>A: analyzeProject(userId, projectId, opciones)
    A->>P: project.findUnique(id, include repositories)
    alt Proyecto inexistente
        P-->>A: null
        A-->>C: NotFoundException
    else Proyecto existente
        P-->>A: Proyecto y repositorios
        par Clonación de repositorios
            A->>G: execute(userId, cloneUrl) por repositorio
            G-->>A: Ruta existente o nuevo clone
        end
        par Descubrimiento por repositorio
            A->>F: findFile(ruta, patrón docker-compose)
            F-->>A: Rutas absolutas
        end
        par Análisis por archivo
            A->>E: Variables y puertos si includePorts
            E-->>A: Datos normalizados
        end
        A-->>C: Rutas y composeAnalyses
    end
```

## Etapas

1. `getComposeFiles` busca el proyecto por `projectId`, incluyendo todos sus repositorios asociados.
2. Clona o reutiliza cada repositorio usando la conexión GitHub de `userId`. Espera el `Promise.all` de clonaciones antes de iniciar la búsqueda.
3. Ejecuta búsquedas por repositorio en paralelo y aplana los resultados en `dockerFilesPath`.
4. `analyzeProject` analiza cada ruta encontrada en paralelo. Por archivo, también ejecuta variables y puertos en paralelo; cada extractor lee y parsea el YAML por separado.
5. Devuelve `clonedRepositoryPaths`, `dockerFilesPath` y `composeAnalyses`.

`includePorts` vale `true` por defecto. Con `false`, no se invoca el extractor de puertos y el resultado interno contiene `ports: []` para cada archivo. El consumidor HTTP `/project/init` elimina además esa propiedad de su respuesta.

## Casos vacíos y fallos

Un proyecto sin repositorios devuelve las tres listas vacías. Si hay repositorios pero no archivos compatibles, conserva las rutas clonadas y devuelve `dockerFilesPath: []` y `composeAnalyses: []`.

Una excepción de clonación, lectura o extracción rechaza la operación completa: no hay respuesta parcial de análisis. `Promise.all` no cancela las operaciones ya iniciadas. Un fallo puede dejar clones creados en disco; no hay rollback de esas carpetas.

Los arreglos producidos por `Promise.all` conservan el orden de sus entradas, aunque las operaciones terminen en otro orden. No hay `orderBy` en la consulta de repositorios ni ordenación explícita de las entradas del sistema de archivos: no se garantiza un orden estable de candidatos.

El descubrimiento aislado `getComposeFiles` termina antes de la etapa de extracción. Lo utiliza el despliegue para comprobar que el Compose solicitado está entre los archivos del proyecto.
''', ['src/analisys/application/project-analysis.service.ts', 'src/deployment/presentation/deployment.controller.ts', 'src/deployment/application/use-cases/deploy-compose.use-case.ts', 'src/shared/infrastructure/files/recursive-file-finder.service.ts']),

'Analisis - Implementacion y contratos': ('''# Análisis · implementación y contratos

## Módulo Nest

`AnalysisModule` importa `PrismaModule` y `RepositoryModule`. Registra `ProjectAnalysisService` y tres adaptadores mediante símbolos; exporta únicamente el servicio de análisis. No declara controladores propios. `DeploymentModule` lo importa y alberga los controladores HTTP que consumen sus métodos.

| Dependencia | Implementación / propósito |
| --- | --- |
| `PrismaService` | Consultar proyecto y relaciones |
| `CloneRepositoryUseCase` | Reutilizar o clonar cada repositorio |
| `FILE_FINDER_PORT` | `RecursiveFileFinderService`: localizar archivos |
| `ENVIROMENT_VARIABLE_EXTRACT_PORT` | `YamlComposeEnviromentVariableExtractService`: extraer variables |
| `COMPOSE_PORT_EXTRACT_PORT` | `YamlComposePortExtractService`: extraer puertos |

Los nombres `analisys` y `ENVIROMENT` reproducen la escritura del código. Para sustituir un adaptador hay que conservar el contrato y el token correspondiente.

## Métodos públicos

| Método | Parámetros | Resultado |
| --- | --- | --- |
| `getComposeFiles` | `userId: number`, `projectId: number` | `Promise<ProjectComposeFiles>` |
| `analyzeProject` | Los anteriores; opciones `{ includePorts?: boolean } = {}` | `Promise<ProjectAnalysis>` |

`userId` se usa para obtener credenciales de clonación. `projectId` identifica el proyecto consultado. `includePorts` controla la extracción; no es un parámetro expuesto por los endpoints actuales.

```typescript
interface ProjectComposeFiles {
  clonedRepositoryPaths: string[];
  dockerFilesPath: string[];
}

interface ProjectComposeAnalysis {
  dockerComposePath: string;
  environmentVariables: EnvironmentVariable[];
  ports: ComposePort[];
}

interface ProjectAnalysis extends ProjectComposeFiles {
  composeAnalyses: ProjectComposeAnalysis[];
}
```

Las rutas son las del sistema de archivos del backend. `dockerFilesPath` contiene los Compose encontrados, aunque su nombre sugiera Dockerfiles. No incluye archivos `Dockerfile` por ese solo nombre.

## Contratos de los adaptadores

```typescript
FileFinderPort.findFile(directoryPath: string, pattern: RegExp): Promise<string[]>
EnviromentVariableExtractPort.analyze(filePath: string): Promise<ComposeAnalysis>
ComposePortExtractPort.analyze(filePath: string): Promise<ComposePortAnalysis>
```

`ComposeAnalysis` contiene `environmentVariables`; `ComposePortAnalysis` contiene `ports`. Sus estructuras se explican en [[Analisis - Variables y puertos]]. Los tipos TypeScript no añaden validación de entrada en tiempo de ejecución.

## Consumo interno

```typescript
// Dentro de un proveedor que inyecta ProjectAnalysisService:
const files = await this.projectAnalysis.getComposeFiles(userId, projectId);
const full = await this.projectAnalysis.analyzeProject(userId, projectId);
const envOnly = await this.projectAnalysis.analyzeProject(userId, projectId, {
  includePorts: false,
});
```

Son ejemplos de llamadas al servicio, no scripts autónomos. El consumidor debe formar parte del grafo Nest y tener acceso a `AnalysisModule`.
''', ['src/analisys/analysis.module.ts', 'src/analisys/application/project-analysis.service.ts', 'src/deployment/deployment.module.ts', 'src/shared/application/file-finder.port.ts', 'src/shared/application/enviroment-variable-extract.port.ts', 'src/shared/application/compose-port-extract.port.ts']),

'Analisis - ORM y archivos': (r'''# Análisis · ORM y archivos

## Consulta principal

```typescript
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: { repositories: true },
});
```

Si no existe, lanza `NotFoundException` con `The project with id N does not exist`. No se crea un proyecto desde el análisis ni se modifican sus asociaciones.

| Modelo | Campos relevantes |
| --- | --- |
| `Project` | `id: Int` autoincremental; `name` único; `description`; fechas; `repositories: Repository[]`; `deployments: Deployment[]` |
| `Repository` | `id: Int` sin autoincremento declarado; `name`; `gitUrl`; `cloneUrl` único; `projects: Project[]` |
| `GitHubConnection` | `userId` único; `username`; `accessToken` cifrado |

`Project` y `Repository` tienen relación muchos a muchos implícita en Prisma. El servicio toma `repository.cloneUrl` de la relación cargada. No hay un modelo `Analysis` ni una tabla de resultados de extracción.

El modelo de proyecto no declara un propietario `userId`. La consulta filtra solo por ID: la autenticación de las rutas no equivale a una comprobación de pertenencia del proyecto a ese usuario.

## Clonación y reutilización

`CloneRepositoryUseCase` valida una URL HTTPS de `github.com` y obtiene el último segmento de su ruta como nombre, quitando `.git`. Consulta `gitHubConnection.findUnique({ where: { userId } })`. Sin conexión, devuelve 404.

El destino es `resolve(process.cwd(), 'repo', username, repositoryName)`. Se validan el nombre y el username y se comprueba que el destino permanezca dentro de `repo`.

Si `access(destination)` tiene éxito, devuelve esa ruta inmediatamente. No verifica que sea un clone correcto, no hace `fetch`/`pull`, no selecciona rama ni verifica la vigencia del token. La conexión GitHub sí se consulta antes de reutilizarlo.

Para un destino nuevo, descifra `accessToken` y el adaptador ejecuta `git clone cloneUrl destination`. Entrega credenciales mediante `GIT_ASKPASS`, `GIT_USERNAME` y `GIT_PASSWORD`, con prompts interactivos desactivados. El script temporal de autenticación se elimina en `finally`.

El destino usa el username autenticado y el nombre corto del repositorio, sin incluir el propietario de la URL. Dos repositorios de distintos propietarios con el mismo nombre pueden apuntar al mismo destino. Clonaciones concurrentes al mismo destino tampoco tienen un bloqueo explícito.

## Descubrimiento recursivo

El patrón del análisis es:

```regex
(^|/)docker-compose.*\.yml$
```

| Nombre relativo | Descubierto |
| --- | --- |
| `docker-compose.yml` | Sí |
| `docker-compose.prod.yml` | Sí |
| `apps/api/docker-compose.local.yml` | Sí |
| `docker-compose.yaml` | No |
| `compose.yml` | No |
| `my-docker-compose.yml` | No |
| `Dockerfile` | No |

La búsqueda resuelve la raíz absoluta, recorre directorios mediante `readdir`, normaliza los separadores de la ruta relativa a `/` y devuelve rutas absolutas nativas. No excluye `.git`, `node_modules` u otras carpetas. Omite entradas que no sean archivos o directorios según `Dirent`; no sigue enlaces simbólicos explícitamente.

Una ruta inaccesible propaga la excepción de lectura. Los Compose encontrados se analizan individualmente: no se combinan archivos base y overrides.
''', ['prisma/models/project.prisma', 'prisma/models/repository.prisma', 'prisma/models/github-connection.prisma', 'src/analisys/application/project-analysis.service.ts', 'src/repository/application/use-cases/repository/clone-repository.use-case.ts', 'src/shared/infrastructure/git/git-repository-cloner.service.ts', 'src/shared/infrastructure/files/recursive-file-finder.service.ts']),

'Analisis - Variables y puertos': ('''# Análisis · variables y puertos

Ambos extractores leen UTF-8 y utilizan `yaml.parse` con `{ merge: true }`, que permite procesar merges YAML. No ejecutan `docker compose config`, no cargan `.env` ni resuelven expresiones contra el entorno real del proceso.

## Variables

Se inspecciona únicamente `services.<servicio>.environment`, en sintaxis de mapa o lista. Si el documento no contiene un objeto `services`, devuelve una lista vacía. Omite definiciones de servicio incompatibles y entradas de lista que no sean strings.

| Campo | Significado |
| --- | --- |
| `service` | Nombre de la clave del servicio |
| `name` | Nombre de la variable declarada para el contenedor |
| `source` | `literal` o `interpolation` |
| `value` | Literal serializado o nombre de variable referenciada |
| `defaultValue` | Valor por defecto detectado o `null` |

Ejemplos para el servicio `api`:

| Declaración | `name` | `source` | `value` | `defaultValue` |
| --- | --- | --- | --- | --- |
| `NODE_ENV: production` | `NODE_ENV` | literal | `production` | null |
| `PORT: ${HTTP_PORT:-3000}` | `PORT` | interpolation | `HTTP_PORT` | `3000` |
| `PORT: ${HTTP_PORT-3000}` | `PORT` | interpolation | `HTTP_PORT` | `3000` |
| `TOKEN: ${TOKEN:?mensaje}` | `TOKEN` | interpolation | `TOKEN` | null |
| `TOKEN: $TOKEN` | `TOKEN` | interpolation | `TOKEN` | null |
| `FLAG: true` | `FLAG` | literal | `true` como string | null |
| `OPTIONAL:` | `OPTIONAL` | interpolation | `OPTIONAL` | null |
| Lista `- OPTIONAL` | `OPTIONAL` | interpolation | `OPTIONAL` | null |
| Lista `- VALUE=a=b` | `VALUE` | literal | `a=b` | null |

Una entrada de lista se separa por el primer `=`. Valores de mapa string, number y boolean se convierten a string; null/undefined y estructuras no escalares se convierten a null y acaban representados como interpolación del nombre de la variable.

La expresión con llaves admite `${VAR}`, `${VAR:-default}`, `${VAR-default}`, `${VAR:?error}` y `${VAR?error}`. Solo `:-` y `-` generan `defaultValue`. No conserva el operador ni el mensaje de error y no distingue su semántica ante strings vacíos.

La regex con llaves busca la primera coincidencia dentro del valor: `URL: https://${HOST}/api` se representa como `value: HOST`, perdiendo el texto alrededor. Un valor con varias interpolaciones conserva una sola coincidencia. La variante `$VAR` exige que ocupe todo el valor. No hay evaluación de expresiones anidadas, operadores alternativos o escapes de dólares conforme al motor completo de Compose.

No se inspeccionan `env_file`, `.env`, build args, imágenes, comandos, dependencias ni interpolaciones de otras secciones. No se eliminan duplicados.

## Puertos

Se inspecciona `services.<servicio>.ports` cuando es un arreglo. `parseComposePort` normaliza sintaxis corta y larga sin resolver interpolaciones.

| Campo | Significado |
| --- | --- |
| `service` | Nombre del servicio |
| `hostIp` | Dirección declarada del host o null |
| `publishedPort` | Puerto publicado como string o null |
| `targetPort` | Puerto del contenedor como string |
| `protocol` | Protocolo declarado; `tcp` por defecto |
| `mappingType` | `range` si un puerto coincide con dígitos-dígitos; si no, `one-to-one` |

| Declaración | `hostIp` | `publishedPort` | `targetPort` | `protocol` | Tipo |
| --- | --- | --- | --- | --- | --- |
| `"8080:3000"` | null | `8080` | `3000` | tcp | one-to-one |
| `"127.0.0.1:8080:3000"` | `127.0.0.1` | `8080` | `3000` | tcp | one-to-one |
| `"53:53/udp"` | null | `53` | `53` | udp | one-to-one |
| `3000` | null | null | `3000` | tcp | one-to-one |
| `"8000-8002:3000-3002"` | null | `8000-8002` | `3000-3002` | tcp | range |

La sintaxis larga admite `target` string/number y `published` string/number/null. Lee `host_ip` y `protocol` si son strings. Ignora otros atributos como `mode`, `name` y `app_protocol`.

Entradas no compatibles o sin target no vacío se omiten. No comprueba que el puerto sea numérico, esté en 1..65535, esté libre o tenga un protocolo soportado por el despliegue. Un string `${HOST_PORT}:3000` conserva `${HOST_PORT}` como `publishedPort`. No expande rangos ni inspecciona `expose`.

## Ejemplo combinado

```yaml
services:
  api:
    image: ejemplo/api
    environment:
      NODE_ENV: production
      PORT: ${PORT:-3000}
    ports:
      - "8080:3000"
```

Produce dos variables para `api` y un puerto `publishedPort: "8080"`, `targetPort: "3000"`. El archivo no se modifica, el puerto no se reserva y `PORT` no se sustituye en el YAML durante esta extracción. El ejemplo de respuesta HTTP aparece en [[Analisis - Endpoints]].
''', ['src/shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.ts', 'src/shared/infrastructure/compose/yaml-compose-port-extract.service.ts', 'src/shared/application/compose-ports.ts', 'src/shared/application/enviroment-variable-extract.port.ts', 'src/shared/application/compose-port-extract.port.ts']),

'Analisis - Endpoints': ('''# Análisis · endpoints

Las rutas pertenecen a controladores declarados en `DeploymentModule`; `AnalysisModule` no tiene un prefijo HTTP propio ni un endpoint `/analysis`.

## Autenticación y parámetros comunes

Ambas rutas están protegidas por `JwtAuthGuard`. Aceptan el JWT de sesión por cookie `access_token` o por `Authorization: Bearer <JWT>`. El usuario se obtiene de `request.user.id`; no se envía `userId` en el cuerpo.

| Parámetro | Ubicación | Tipo esperado | Propósito |
| --- | --- | --- | --- |
| `projectId` | JSON body | number | Proyecto cuyos repositorios se buscarán |

No tienen parámetros de ruta ni query. Los DTO usan `@ApiProperty`, sin validadores; `main.ts` no configura `ValidationPipe`. El contrato espera un ID numérico existente, pero no garantiza rechazar de forma limpia tipos incorrectos o un ID ausente. No debe asumirse que toda entrada inválida produce 400.

## POST /deployment/docker_files

Ejecuta `analyzeProject(userId, projectId)` con puertos habilitados. Devuelve rutas, variables y puertos, aunque la descripción Swagger mencione principalmente variables.

```http
POST /deployment/docker_files
Authorization: Bearer <JWT>
Content-Type: application/json

{"projectId": 12}
```

Ejemplo de respuesta para un Compose con `PORT: ${PORT:-3000}` y puerto `8080:3000`:

```json
{
  "success": true,
  "data": {
    "clonedRepositoryPaths": ["/app/repo/usuario/api"],
    "dockerFilesPath": ["/app/repo/usuario/api/docker-compose.yml"],
    "composeAnalyses": [
      {
        "dockerComposePath": "/app/repo/usuario/api/docker-compose.yml",
        "environmentVariables": [
          {
            "service": "api",
            "name": "PORT",
            "source": "interpolation",
            "value": "PORT",
            "defaultValue": "3000"
          }
        ],
        "ports": [
          {
            "service": "api",
            "hostIp": null,
            "publishedPort": "8080",
            "targetPort": "3000",
            "protocol": "tcp",
            "mappingType": "one-to-one"
          }
        ]
      }
    ]
  },
  "error": null,
  "meta": null
}
```

Las rutas son del backend: en Windows o con otro directorio de trabajo serán diferentes. Las estructuras públicas se declaran en `ProjectDockerFilesResponse` del paquete compartido.

## POST /project/init

Recibe el mismo cuerpo `{"projectId": 12}`. Ejecuta `analyzeProject` con `{ includePorts: false }` y adapta el resultado a `InitProjectResponse`:

```typescript
{
  clonedRepositoryPaths: string[];
  dockerComposePaths: string[];
  composeAnalyses: {
    dockerComposePath: string;
    environmentVariables: EnvironmentVariable[];
  }[];
}
```

Esta estructura va en `data` dentro del mismo envelope. Usa `dockerComposePaths`, en lugar de `dockerFilesPath`, y omite `ports`. No basta con cambiar la URL y reutilizar sin adaptación todos los accesos a la respuesta anterior.

## Estado HTTP y errores

Ambas rutas son `@Post` sin `@HttpCode`. El estado de éxito esperado por la configuración actual de Nest es **201**, aunque Swagger declara **200** para ellas. El interceptor global envuelve los datos y no cambia ese estado. No se comprobó mediante una llamada HTTP real durante esta documentación.

| Estado | Causa observada en código |
| --- | --- |
| 401 | JWT ausente, inválido o expirado |
| 404 | Proyecto inexistente; conexión GitHub del usuario inexistente |
| 400 | URL de clonación o username rechazados por el caso de uso |
| 500 | Git no ejecutable, clonación fallida, errores genéricos de Prisma, lectura o parseo |

Un proyecto sin repositorios o sin Compose compatibles es una respuesta exitosa con listas vacías, no un 404.

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "Not Found",
    "message": "The project with id 12 does not exist"
  },
  "meta": null
}
```

`ApiExceptionFilter` conserva el estado de una `HttpException`; para excepciones genéricas usa 500 y puede devolver su `Error.message`. El mensaje concreto depende del fallo. Swagger se expone en `/docs`.
''', ['src/deployment/presentation/deployment.controller.ts', 'src/deployment/deployment.module.ts', 'src/deployment/application/dto/project-compose-files.dto.ts', 'src/deployment/application/dto/init-project.dto.ts', 'src/main.ts', 'src/auth/infrastructure/passport/jwt.strategy.ts', 'src/shared/presentation/interceptors/api-response.interceptor.ts', 'src/shared/presentation/filters/api-exception.filter.ts', 'packages/shared/src/repository/responses/project-docker-files.response.ts', 'packages/shared/src/repository/responses/init-project.response.ts']),

'Analisis - Uso y frontend': ('''# Análisis · uso y frontend

## Apertura de un proyecto

`useProjectOpen.handleOpenProject(projectId)` abre el panel y llama a `projectService.environmentVariables({ projectId })`. Ese nombre es un alias de `dockerFilesPath`: ambos hacen POST `/deployment/docker_files` y devuelven el análisis completo.

Con una respuesta exitosa, `compose.helpers.ts` asocia los resultados a repositorios usando el nombre corto y la carpeta del clone. Normaliza separadores, compara nombres sin distinguir mayúsculas y selecciona las rutas Compose contenidas bajo el directorio identificado.

El hook envía al estado de despliegues tres acciones:

| Acción | Datos que prepara |
| --- | --- |
| `deploy-paths-discovered` | Candidatos y primer Compose por repositorio |
| `deploy-env-discovered` | Filas de variables editables |
| `deploy-ports-discovered` | Filas de puertos declarados |

La primera ruta candidata queda seleccionada; no hay una prioridad explícita para `docker-compose.yml` frente a variantes. Todas las filas incluyen `dockerComposePath` para asociarlas al archivo correspondiente.

Para variables literales, el formulario toma `value`; para interpoladas, `defaultValue` o string vacío. Marca `required` cuando `source === 'interpolation'` y `defaultValue === null`. Es una regla del formulario, no una reproducción completa de la semántica de Compose: una variable que podría heredarse del host se marca requerida por esa regla.

Si falla la petición, el hook registra el mensaje en el panel del proyecto. `projectService.init` existe como cliente de `/project/init`, pero el hook de apertura revisado utiliza el análisis completo, incluidos puertos.

## Botón Analizar: despliegue y clasificación

```mermaid
flowchart TD
    A[Abrir proyecto] --> B[POST /deployment/docker_files]
    B --> C[Elegir Compose y configurar variables y puertos]
    C --> D[Analizar: useProjectAnalysis]
    D --> E[Crear request por repositorio con ruta seleccionada]
    E --> F[POST /deployment]
    F -->|Éxito| G[POST /deployment/ID/classify]
    F -->|Fallo| H[Estado failed]
    G -->|Éxito| I[Estado succeeded con tipos clasificados]
    G -->|Fallo| J[Estado succeeded con despliegue y mensaje]
```

`startAnalysis` toma los repositorios del proyecto con una ruta seleccionada no vacía. Abre el estado de análisis con cada repositorio en `pending`. Para cada uno construye la solicitud con `createDeploymentRequest` y lanza `deploymentService.deployAndClassify` sin esperar a los demás; no hay un límite de concurrencia explícito.

`deployAndClassify` primero despliega. Si funciona, clasifica el despliegue creado. Si la clasificación falla, conserva la respuesta exitosa del despliegue y devuelve `classificationError`: el reducer registra `succeeded` acompañado del mensaje. Si falla el despliegue o la construcción de su solicitud, registra `failed`.

La interfaz invalida consultas de puertos después de resolver la operación. `analysisReducer` mantiene proyecto, repositorios, despliegues, mensajes, grupos colapsados, selección y pestaña (`services` o `relations`). Es estado React; no una tabla ORM de análisis.

`closeAnalysis` limpia ese estado y vuelve a la fase del proyecto. No ejecuta una llamada de parada: cerrar la vista no detiene los contenedores que ese flujo desplegó. La vista de relaciones utiliza un componente placeholder; no debe interpretarse como evidencia de relaciones calculadas por `ProjectAnalysisService`.

## Integración con el backend de despliegues

Antes de crear un despliegue, `DeployComposeUseCase` llama a `getComposeFiles`. Comprueba que la ruta solicitada coincide con uno de los candidatos del proyecto. Una ruta externa genera `BadRequestException` con `El archivo Compose no pertenece al proyecto seleccionado`.

Esta verificación utiliza descubrimiento, no extracción de variables o puertos. La preparación del YAML, reserva de puertos, ejecución Docker y persistencia de estados pertenecen al módulo de despliegue y sus adaptadores. El clasificador de contenedores constituye otra responsabilidad distinta de la lectura inicial de Compose.
''', ['apps/web/src/features/projects/hooks/use-project-open.ts', 'apps/web/src/features/projects/project.service.ts', 'apps/web/src/features/projects/compose.helpers.ts', 'apps/web/src/features/projects/hooks/use-project-analysis.ts', 'apps/web/src/features/projects/deployment.service.ts', 'apps/web/src/features/analysis/analysis.reducer.ts', 'apps/web/src/features/projects/components/analyze/analyze-relations-placeholder.tsx', 'src/deployment/application/use-cases/deploy-compose.use-case.ts']),

'Analisis - Diagnostico y pruebas': ('''# Análisis · diagnóstico y pruebas

## Requisitos y configuración

El módulo no declara variables de entorno propias. Necesita una conexión Prisma operativa, un proyecto y sus asociaciones a repositorios. Para proyectos con repositorios, requiere la conexión GitHub del usuario autenticado; para clones nuevos, también descifrado del token, Git ejecutable, acceso a GitHub y permisos de escritura en `repo` bajo el directorio de trabajo.

`DATABASE_URL` configura Prisma; `ENCRYPTION_SECRET_KEY` es la clave de cifrado compartida y `JWT_SECRET` permite validar la sesión de los endpoints. La ubicación de clones se calcula desde `process.cwd()` y no desde un parámetro del endpoint. El arranque general de la aplicación tiene requisitos adicionales, incluidos Docker y Redis; no son operaciones realizadas por el extractor YAML.

## Diagnóstico

| Síntoma | Comprobación |
| --- | --- |
| 401 antes del análisis | Cookie/JWT, expiración y secreto del backend |
| `The project with id N does not exist` | Proyecto y tipo del ID enviado |
| Usuario sin conexión GitHub | Fila `GitHubConnection` para el ID autenticado |
| No se puede ejecutar Git | Ejecutable en PATH del proceso backend |
| Error al clonar | URL, autorización del token, red y directorio destino |
| Resultados antiguos | Clone reutilizado sin pull/fetch |
| Listas de Compose vacías | Asociaciones y patrón `docker-compose*.yml` |
| Falta un archivo `.yaml` o `compose.yml` | Nombre fuera del patrón del módulo |
| 500 de lectura o YAML | Ruta accesible, contenido y sintaxis del archivo |
| Faltan variables de env_file | Esa sección no se inspecciona |
| Un valor compuesto pierde texto | Solo se conserva la primera interpolación reconocida |
| Puertos sin resolver | El análisis conserva expresiones; no evalúa `.env` |
| `/project/init` no devuelve puertos | Extracción deshabilitada y respuesta adaptada |
| Repositorio asociado a ruta equivocada | Colisión de nombres cortos de clones/helper frontend |
| Analizar inicia contenedores | La acción UI llama a deployAndClassify |
| Clasificación fallida con estado succeeded | Se conserva un despliegue exitoso y un mensaje de clasificación |

## Cobertura existente revisada

`project-analysis.service.spec.ts` verifica descubrimiento de nombres admitidos, extracción de variables y puertos, exclusión del extractor de puertos cuando se solicita, listas vacías sin repositorios, proyecto inexistente, propagación de fallos de clonación/extracción y consumidores.

Los casos de consumidores verifican la adaptación de `/project/init` y el rechazo de un Compose ajeno al proyecto antes de ejecutar extractores. Usan mocks: no validan un clone Git real, credenciales, Prisma real o una petición HTTP completa.

`yaml-compose-enviroment-variable-extract.service.spec.ts` crea un archivo temporal y verifica extracción de variables de mapa y lista, literales, default, booleanos y variables sin valor. Eso comprueba lectura y parser del adaptador para ese ejemplo, no todas las reglas de Compose.

Estas pruebas se leyeron como evidencia del comportamiento esperado; **no se ejecutaron durante este trabajo de documentación**. No se modificó el código de la aplicación.

## Comprobación manual sugerida

1. Usar un proyecto de prueba con un repositorio conocido y una sesión válida.
2. Enviar POST `/deployment/docker_files` con su ID y comparar las rutas con los archivos realmente presentes en el backend.
3. Comparar variables y puertos de un Compose simple con [[Analisis - Variables y puertos]].
4. Enviar POST `/project/init` y verificar el cambio de nombre a `dockerComposePaths` y la ausencia de `ports`.
5. Revisar un proyecto sin repositorios y un ID inexistente para distinguir listas vacías de 404.
6. Si se verifica el botón Analizar, hacerlo considerando que crea despliegues; revisar sus estados y detenerlos por el flujo de despliegues cuando termine la comprobación.

Las comprobaciones anteriores son propuestas para un entorno de prueba, no acciones ejecutadas en esta sesión.
''', ['src/analisys/application/project-analysis.service.spec.ts', 'src/shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.spec.ts', 'src/repository/application/use-cases/repository/clone-repository.use-case.ts', 'src/shared/infrastructure/git/git-repository-cloner.service.ts', 'src/prisma/prisma.service.ts', 'src/auth/infrastructure/passport/jwt.strategy.ts', 'src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts', 'apps/web/src/features/projects/deployment.service.ts']),
}

for title, (body, sources) in notes.items():
    for link in re.findall(r'\[\[([^\]]+)\]\]', body):
        assert link in notes, (title, link)
    footer = '\n## Fuentes del código\n\n'
    for source in sources:
        file = repo / source
        assert file.is_file(), source
        footer += f'- [{source}]({file.as_uri()})\n'
    metadata = '---\ntags:\n  - neoglito\n  - analisis\n  - documentacion-tecnica\nfuncionalidad: analisis\nactualizado: 2026-10-10\n---\n\n'
    (out / f'{title}.md').write_text(metadata + body.strip() + '\n' + footer, encoding='utf-8')
print(f'{len(notes)} notas de análisis; referencias internas y fuentes verificadas.')
