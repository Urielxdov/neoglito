from pathlib import Path
import re

base = Path(__file__).resolve().parent
repo = base.parent.parent
out = base / 'Repository'
out.mkdir(exist_ok=True)
vault = Path('C:/Users/Uriel-Galvan/Documents/neoglito/neoglito')
notes = {}

def note(title, body, sources):
    notes['Repository - ' + title] = (body, sources)

note('Indice', '''# Repository · documentación técnica

`RepositoryModule` permite consultar los repositorios accesibles mediante la conexión GitHub del usuario, registrar sus metadatos asociados a proyectos y clonar repositorios en el disco del backend para el análisis Compose.

Documentación inferida del código revisado el **10 de octubre de 2026**. No se hicieron peticiones a GitHub, clones, migraciones ni pruebas de la aplicación para redactarla.

## Recorrido

1. [[Repository - Flujos]]: listado remoto, registro y clonación.
2. [[Repository - Implementacion y contratos]]: dependencias, casos de uso, entidades y puertos.
3. [[Repository - ORM y vinculacion]]: upsert, relaciones y conflictos.
4. [[Repository - GitHub y credenciales]]: conexión, consulta remota y cifrado.
5. [[Repository - Clonacion paso a paso]]: validación, destino, ASKPASS y ejecución Git.
6. [[Repository - Endpoints]]: parámetros, respuestas y errores.
7. [[Repository - Uso y frontend]]: búsqueda, selección, caché y registro desde Project.
8. [[Repository - Diagnostico y pruebas]]: límites, ejemplos y verificación.

## Tres representaciones diferentes

| Representación | Fuente | Contenido |
|---|---|---|
| Catálogo remoto | GitHub `/user/repos` | Visibilidad, descripción, lenguaje, URLs y fecha remota |
| Registro persistido | Prisma Repository | id, name, gitUrl, cloneUrl y proyectos vinculados |
| Copia local | Disco del backend | Directorio bajo `repo/<username>/<nombre>` |

Listar no registra automáticamente en Prisma. Registrar no clona. Clonar directamente no exige un registro Repository ni un vínculo Project. El análisis de un proyecto combina los vínculos persistidos con el clonador exportado por este módulo.

El registro HTTP es público. Listado y clonación requieren JWT. Reutilizar un destino existente no comprueba `.git`, URL de origen, rama ni actualización. El listado remoto no pagina después de sus primeros 100 resultados.

Relacionados: [[Project - Indice]], [[Autenticacion - Indice]], [[Analisis - Indice]] y [[Deployment - Indice]].
''', ['src/repository/repository.module.ts', 'src/repository/presentation/repository.controller.ts', 'prisma/models/repository.prisma'])

note('Flujos', '''# Repository · flujos

## Listar repositorios remotos

```mermaid
sequenceDiagram
    participant C as Cliente
    participant H as RepositoryController
    participant U as GetRepositoriesUseCase
    participant P as Prisma
    participant E as EncryptionPort
    participant G as GitHub
    C->>H: GET /repository/all con JWT
    H->>U: execute(request.user.id)
    U->>P: gitHubConnection.findUnique por userId
    P-->>U: Conexión con token cifrado
    U->>E: decrypt(accessToken)
    E-->>U: Token utilizable en memoria
    U->>G: GET /user/repos?per_page=100
    G-->>U: Array JSON
    U->>U: Mapear contratos y valores nulos
    U-->>C: 200, data RepositoryResponse[]
```

Si falta conexión, se devuelve 404 antes del descifrado. Si GitHub responde un estado no exitoso, se devuelve 502. El listado no lee la tabla Repository ni sincroniza sus registros. El JWT identifica al usuario local; el token descifrado es el que se envía a GitHub.

## Registrar y vincular

```mermaid
sequenceDiagram
    participant C as Cliente
    participant U as CreateRepositoryUseCase
    participant P as ProjectRepository
    participant R as RepositoryRepository
    participant DB as Prisma/PostgreSQL
    C->>U: projectId, id, name, gitUrl, cloneUrl
    U->>U: Recortar cadenas y validar ids positivos
    U->>P: findById(projectId)
    U->>R: findByProjectIdAndCloneUrl
    alt Mismo cloneUrl ya vinculado
        U-->>C: 409
    else Sin vínculo duplicado
        U->>R: save(Repository con projectIds=[projectId])
        R->>DB: upsert por id y connect del proyecto
        DB-->>U: Registro y vínculos actuales
        U-->>C: 201, CreateRepositoryResponse
    end
```

No se hace una consulta GitHub para validar que el id o las URLs correspondan al usuario. El request se limita a metadatos y vínculo. Un id ya existente puede actualizar su nombre y URLs globalmente, además de agregar el proyecto recibido.

## Clonar o reutilizar

```mermaid
flowchart TD
    A[POST repository/clone con JWT] --> B[Validar cloneUrl y obtener nombre]
    B --> C[Buscar conexión por userId]
    C --> D[Validar username y construir destino]
    D --> E{access destino exitoso?}
    E -->|Sí| F[Devolver destino existente]
    E -->|No| G[Descifrar accessToken]
    G --> H[Crear ASKPASS temporal]
    H --> I[Ejecutar git clone]
    I --> J[Limpiar directorio temporal en finally]
    J --> K[Devolver pathSystem o propagar error]
```

La conexión se exige incluso si el destino ya existe. En cambio, el token solo se descifra cuando no se puede acceder al destino. No hay lectura de Repository ni Project en este caso de uso.

## Uso desde análisis

ProjectAnalysisService carga un proyecto con repositories desde Prisma y llama `CloneRepositoryUseCase.execute(userId, {cloneUrl})` para cada vínculo mediante Promise.all. Luego busca y analiza Compose bajo las rutas obtenidas. Un fallo no cancela automáticamente las clonaciones restantes ni borra las que ya terminaron. [[Analisis - Flujo]] describe el recorrido posterior.

Volver a [[Repository - Indice]].
''', ['src/repository/application/use-cases/repository/get-repositories.use-case.ts', 'src/repository/application/use-cases/repository/create-repository.use-case.ts', 'src/repository/application/use-cases/repository/clone-repository.use-case.ts', 'src/analisys/application/project-analysis.service.ts'])

note('Implementacion y contratos', '''# Repository · implementación y contratos

## Módulo y proveedores

RepositoryModule importa AuthModule, PrismaModule y ProjectModule. Registra RepositoryController y tres casos de uso: CreateRepositoryUseCase, GetRepositoriesUseCase y CloneRepositoryUseCase.

| Token | Implementación mediante useClass | Consumidor |
|---|---|---|
| REPOSITORY_REPOSITORY | PrismaRepositoryRepository | Registro de metadatos y vínculos |
| ENCRYPTION_PORT | Aes256GcmEncryptionService | Listado GitHub y clonación |
| GIT_CLONER_PORT | GitCloneRepositoryService | Clonación |
| PROJECT_REPOSITORY | Exportado por ProjectModule | Comprobar existencia del proyecto al registrar |

El módulo exporta **CloneRepositoryUseCase**. No exporta REPOSITORY_REPOSITORY, el controlador ni los otros casos de uso. Análisis importa el módulo para consumir el caso de uso exportado.

La consulta GitHub usa fetch directamente dentro de GetRepositoriesUseCase; no existe aquí un puerto de cliente GitHub. El archivo infrastructure/github/github-repository.response.ts declara la forma esperada del JSON, pero no ejecuta la petición ni valida su forma durante la ejecución.

## Entidad Repository

El constructor asigna campos readonly id:number, projectIds:number[], name:string, gitUrl:string y cloneUrl:string. No tiene métodos, validación, fechas, visibilidad ni ruta de clonación. El array projectIds resume las relaciones incluidas desde Prisma; no representa un propietario.

## Puerto de persistencia

| Método | Retorno | Semántica actual |
|---|---|---|
| save(repository) | Promise de Repository | upsert por id, agregar conexiones a proyectos |
| findById(id) | Promise de Repository | Incluye proyectos; lanza 404 si falta |
| findByProjectIdAndCloneUrl(projectId, cloneUrl) | Promise de Repository o null | Busca cloneUrl con projects.some por id |

No hay métodos para listar registros locales, eliminar, desvincular, guardar ruta local ni sincronizar todo el catálogo GitHub.

## Puerto de clonación

`GIT_CLONER_PORT` identifica `RepositoryClonerPort.clone(cloneUrl, username, accessToken, destination): Promise<string>`. El adaptador recibe ya resueltos el destino y las credenciales. La validación GitHub y la decisión de reutilizar un destino pertenecen al caso de uso, no al adaptador Git.

## DTO y contratos compartidos

`CreateRepositoryDto` tiene projectId, id, name, gitUrl y cloneUrl. `CloneRepositoryDto` tiene cloneUrl. Ambos implementan interfaces compartidas y usan ApiProperty de Swagger sin decoradores de validación. Main tampoco configura ValidationPipe.

CreateRepositoryRequest local copia los cinco campos en propiedades readonly. CreateRepositoryResponse devuelve id, el projectId solicitado, name, gitUrl y cloneUrl. No incluye todos los projectIds persistidos.

RepositoryResponse, usado en el listado remoto, incluye id, name, private, description, language, gitUrl, cloneUrl y updatedAt ISO. CloneRepositoryResponse contiene únicamente pathSystem. Los contratos se encuentran en `packages/shared/src/repository`.

La validación del registro usa Number.isInteger y comparación positiva para los ids; no convierte strings numéricos. Las cadenas pasan por optional chaining y trim. Nulos y vacíos terminan en 400, pero valores no string pueden lanzar TypeError y terminar en 500 antes del bloque de validación.

Volver a [[Repository - Indice]].
''', ['src/repository/repository.module.ts', 'src/repository/domain/entities/repository/repository.entity.ts', 'src/repository/domain/entities/repository/repository.repository.ts', 'src/shared/application/repository-cloner.port.ts', 'src/repository/application/dto/create-repository.dto.ts', 'src/repository/application/dto/clone-repository.dto.ts', 'src/repository/infrastructure/github/github-repository.response.ts', 'packages/shared/src/repository/responses/repository.response.ts', 'src/main.ts'])

note('ORM y vinculacion', '''# Repository · ORM y vinculación

## Modelo actual

```prisma
model Repository {
  id       Int       @id
  name     String
  gitUrl   String
  cloneUrl String    @unique
  projects Project[]
}
```

El id se suministra desde el request, habitualmente el id de GitHub. No tiene default autoincrement. cloneUrl tiene unicidad global. No hay campos userId, timestamps, branch, commit, pathSystem, estado de clonación, private, description o language.

Project tiene repositories Repository[], por lo que el esquema actual expresa una relación muchos a muchos implícita. Un registro de Repository puede compartirse entre varios proyectos.

```mermaid
erDiagram
    Project }o--o{ Repository : vincula
    User ||--o| GitHubConnection : autentica
    Repository {
        int id PK
        string name
        string gitUrl
        string cloneUrl UK
    }
    GitHubConnection {
        int userId UK
        string username
        string accessToken
    }
```

GitHubConnection pertenece a User. No hay relación ORM entre esa conexión y Repository. El catálogo remoto se consulta con credenciales; los vínculos Project se guardan por separado.

## Upsert y conexión

PrismaRepositoryRepository.save usa `repository.upsert({where:{id}, create, update, include:{projects:true}})`. Tanto create como update asignan name, gitUrl, cloneUrl y `projects.connect` con todos los ids del array recibido.

Connect agrega relaciones sin desconectar las previas. El caso de uso de registro entrega un único projectId, pero el adaptador admite un array de conexiones. Después, toDomain convierte projects a projectIds. Cambiar metadatos de un Repository compartido afecta al registro que consultan todos sus proyectos.

Las verificaciones previas no están en una transacción con el upsert. La existencia del proyecto se comprueba mediante ProjectRepository; luego se busca el vínculo por cloneUrl; después se guarda. Cambios concurrentes pueden alterar el estado entre lecturas y escritura.

## Duplicados: qué significa cada comprobación

| Situación | Resultado inferido |
|---|---|
| Mismo cloneUrl ya conectado al mismo proyecto | 409 detectado por el caso de uso |
| Mismo id y URL conectados a otro proyecto | Upsert actualiza metadatos y agrega vínculo |
| cloneUrl existente bajo otro id, aún no vinculado al proyecto solicitado | Puede fallar el índice único con error Prisma no traducido a 409 |
| Mismo id con URL distinta y sin vínculo duplicado por esa URL | Puede actualizar el registro y conservar vínculos previos |
| Registrar dos veces el mismo vínculo | El caso de uso devuelve 409; no ofrece éxito idempotente |

`findByProjectIdAndCloneUrl` usa findFirst con cloneUrl y projects.some{id:projectId}; incluye todas las relaciones projects. `findById` usa findUnique e incluye projects, con NotFoundException si falta. No se publica un endpoint de lectura local por id.

## Historial de migraciones

La migración inicial crea un Repository histórico con id SERIAL, projectId obligatorio, cloneUrl, sshPrivateKey, technology, pathSystem y fechas. Usa unicidad compuesta projectId/cloneUrl y una FK directa a Project.

Ese SQL difiere del esquema actual, que usa id externo, name, gitUrl, cloneUrl único y muchos a muchos. En las migraciones versionadas revisadas no se encontró la conversión completa de esa estructura. Esto describe los archivos del repositorio, no confirma el esquema de una base de datos instalada. No se ejecutaron migraciones ni introspección.

Para el detalle de Project y sus proyecciones, consultar [[Project - ORM y relaciones]].

Volver a [[Repository - Indice]].
''', ['prisma/models/repository.prisma', 'prisma/models/project.prisma', 'prisma/models/github-connection.prisma', 'prisma/migrations/20260922132357/migration.sql', 'src/repository/infrastructure/persistence/prisma-repository.repository.ts', 'src/repository/application/use-cases/repository/create-repository.use-case.ts'])

note('GitHub y credenciales', '''# Repository · GitHub y credenciales

## Identidad y conexión

GET /repository/all y POST /repository/clone reciben userId de request.user.id después de JwtAuthGuard. Consultan `prisma.gitHubConnection.findUnique({where:{userId}})`. Si falta conexión, lanzan 404 con “El usuario no tiene una conexión de GitHub”.

GitHubConnection guarda username, githubId y accessToken cifrado, junto con campos opcionales de refresh y expiración. Estos casos de uso no revisan esos timestamps ni ejecutan renovación de tokens. La autenticación OAuth que crea la conexión se documenta en [[Autenticacion - Flujo]].

## Consulta remota exacta

GetRepositoriesUseCase descifra accessToken y ejecuta fetch a `https://api.github.com/user/repos?per_page=100` con method GET, Authorization Bearer y Accept application/vnd.github+json.

El código no añade page, filtros de visibilidad, sort, afiliación, cabecera de versión, timeout ni reintentos propios. No sigue Link para recuperar páginas siguientes. La respuesta visible puede ser incompleta si la cuenta tiene más resultados. No hay una segunda consulta para organizaciones ni combinación con registros locales.

Un response.ok falso se traduce a BadGatewayException con mensaje genérico. No expone el status original de GitHub como status del endpoint ni diferencia credenciales revocadas, permisos, rate limit o fallos remotos. Si fetch rechaza, falla el JSON o su forma no permite map, no hay catch específico: el filtro global puede devolver 500.

## Mapeo de respuesta

| GitHub | RepositoryResponse |
|---|---|
| id | id |
| full_name | name, normalmente owner/repo |
| private | private |
| description | description; null/undefined → Sin descripción |
| language | language; null/undefined → Sin lenguaje |
| git_url | gitUrl |
| clone_url | cloneUrl |
| updated_at | updatedAt |

El campo name corto del JSON no se usa en la respuesta. gitUrl proviene de git_url, no de html_url. La clonación usa cloneUrl. La consulta no persiste estos valores: se guardan cuando el frontend llama al registro.

## Cifrado y uso del token

RepositoryModule registra Aes256GcmEncryptionService mediante ENCRYPTION_PORT. Su constructor exige `ENCRYPTION_SECRET_KEY` Base64 que decodifique a 32 bytes. Usa AES-256-GCM, IV de 12 bytes y tag de 16 bytes; el payload tiene forma `v1.iv.tag.ciphertext` con componentes Base64URL.

GetRepositoriesUseCase descifra para cada ejecución. CloneRepositoryUseCase descifra solo si el destino no existe. Un token ilegible puede afectar al listado pero pasar inadvertido al reutilizar una carpeta local. El servicio de cifrado se instancia al arrancar: una clave faltante o de longitud incorrecta impide inicializar el proveedor, aunque una ruta concreta no necesite descifrar.

El adaptador Git recibe el token en memoria y lo transmite al entorno del proceso hijo. El código no concatena ese token a cloneUrl ni lo escribe dentro del script ASKPASS. Las respuestas públicas no incluyen credenciales; pathSystem devuelve una ruta del backend. Consultar [[Repository - Clonacion paso a paso]] para el mecanismo concreto y [[Autenticacion - JWT cookie y cifrado]] para el contexto de sesión.

Volver a [[Repository - Indice]].
''', ['src/repository/application/use-cases/repository/get-repositories.use-case.ts', 'src/repository/application/use-cases/repository/clone-repository.use-case.ts', 'src/repository/infrastructure/github/github-repository.response.ts', 'prisma/models/github-connection.prisma', 'src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts', 'src/shared/infrastructure/git/git-repository-cloner.service.ts'])

note('Clonacion paso a paso', '''# Repository · clonación paso a paso

## 1. Validar la URL y extraer el nombre

CloneRepositoryUseCase usa new URL, exige protocolo https y hostname github.com. Toma el último segmento no vacío del pathname y quita el sufijo `.git` en minúsculas. El resultado debe cumplir `[a-zA-Z0-9._-]+` y ser no vacío. Un fallo se transforma en 400 “cloneUrl debe ser una URL HTTPS válida de GitHub”.

No comprueba que haya exactamente dos segmentos owner/repo, que el owner sea válido ni que la URL corresponda a un repositorio existente. Tampoco rechaza explícitamente puerto, query, fragmento o credenciales embebidas. Estos controles describen la validación local; GitHub/Git todavía pueden rechazar la solicitud.

`git@github.com:owner/repo.git`, URLs HTTP y hosts distintos no pasan. El registro de metadatos no aplica esta validación de URL, así que puede aceptar una cadena no vacía que falle al clonar más tarde.

## 2. Buscar conexión y resolver el destino

Después de validar cloneUrl, busca conexión por userId. Usa el username persistido en esa conexión, no el owner de la URL. El username debe cumplir `[a-zA-Z0-9-]+`.

El destino se calcula con `resolve(process.cwd(), 'repo', username, repositoryName)`. Comprueba que relative desde la raíz repo no empiece por `..`. La carpeta se basa en el cwd del backend al ejecutar, no en una variable configurable del módulo.

Ejemplo ilustrativo: clonar `https://github.com/equipo/catalogo.git` con conexión username `ana` produce `<cwd>/repo/ana/catalogo`. Otro owner con un repositorio también llamado catalogo apunta al mismo destino para esa usuaria.

La comprobación es léxica, sin realpath ni inspección de symlinks. La regex admite caracteres como puntos; no debe interpretarse como una validación completa de nombres GitHub o de nombres de archivo específicos de Windows.

## 3. Reutilizar si access funciona

El helper exists llama fs.access y retorna true si termina; cualquier error devuelve false. No verifica que sea un directorio, que contenga `.git`, que coincida el remote, que el clone esté completo o que su contenido siga accesible en GitHub.

Si existe, retorna inmediatamente la ruta: no descifra el token, no hace fetch/pull, no consulta branch/commit ni compara el origen. La copia puede estar desactualizada o pertenecer a otra URL con el mismo nombre corto. La relación con Project tampoco forma parte del destino.

No hay lock entre comprobar y clonar. Dos requests o dos clones de análisis concurrentes pueden intentar el mismo destino. El resultado depende del proceso Git y del estado del filesystem; no existe una política de espera/reutilización del trabajo en curso.

## 4. Preparar autenticación ASKPASS

Cuando el destino no existe, el caso de uso descifra accessToken y llama al puerto Git. El adaptador:

1. Crea un directorio temporal bajo tmpdir con prefijo github-clone-.
2. Define askpass.sh dentro de él.
3. Dentro del try crea recursivamente el padre del destino.
4. Escribe el script con modo 0700 y aplica chmod 0700.
5. Ejecuta Git.
6. En finally elimina el directorio temporal recursivamente.

El script usa un shebang `/bin/sh` y responde a prompts que contengan Username o Password, imprimiendo las variables GIT_USERNAME o GIT_PASSWORD mediante printf. Para otros prompts termina con código 1.

El script no contiene el valor literal del token; se resuelve desde el entorno del hijo. Los modos POSIX no equivalen a una configuración explícita de ACL Windows. El entorno debe permitir ejecutar ese helper, por ejemplo mediante el soporte correspondiente de la instalación de Git; no hay una variante del script para PowerShell ni una detección de plataforma.

## 5. Ejecutar Git

```text
Ejecutable: git
Argumentos: [clone, cloneUrl, destination]
Entorno: process.env más
  GIT_ASKPASS=<ruta askpass.sh>
  GIT_USERNAME=<username de conexión>
  GIT_PASSWORD=<token descifrado>
  GIT_TERMINAL_PROMPT=0
stdio: [ignore, ignore, pipe]
```

spawn no activa shell. No se concatena un comando shell, ni se introducen los datos como código dentro del script. El adaptador no configura windowsHide, timeout, AbortSignal, cwd específico, profundidad de clonación, rama, submódulos ni una ruta configurable al ejecutable Git.

stdout se ignora. stderr se acumula completo como string, sin límite configurado. Un evento error rechaza con 500 “No fue posible ejecutar Git”. Al cerrar con código 0 resuelve; otro código rechaza con 500 y el stderr recortado en el mensaje “No fue posible clonar el repositorio: …”. No hay redacción adicional de stderr ni clasificación por causa.

## 6. Limpiar y devolver

El finally limpia el directorio temporal tanto en éxito como en fallo de las operaciones dentro del try. No borra el destino de un clone fallido. Un error de limpieza también puede propagarse; no hay catch independiente para conservar otro error.

En éxito devuelve destination; el controlador lo transforma en `{pathSystem}`. No guarda la ruta en Repository, no crea un Project y no registra un estado de clonación. La siguiente solicitud puede reutilizar un destino parcial si access funciona.

## Límites operativos del recorrido

Sin timeout ni cancelación explícita, el request puede permanecer pendiente mientras Git siga activo. Los clones persisten entre solicitudes; no hay endpoint de actualización o limpieza. El análisis posterior lee esa copia local, por lo que un cambio remoto no se incorpora automáticamente. Para rutas bajo Docker, la traducción usada en despliegues pertenece a [[Container - Docker y rutas]], no a este clonador.

Volver a [[Repository - Indice]].
''', ['src/repository/application/use-cases/repository/clone-repository.use-case.ts', 'src/shared/infrastructure/git/git-repository-cloner.service.ts', 'src/shared/application/repository-cloner.port.ts', 'src/repository/presentation/repository.controller.ts'])

note('Endpoints', '''# Repository · endpoints

No hay prefijo global de API. Los POST conservan el estado 201 predeterminado de Nest; GET devuelve 200. El interceptor global envuelve éxitos y el filtro global envuelve errores.

| Método y ruta | JWT | Entrada | data de éxito |
|---|---|---|---|
| GET /repository/all | Sí | Sin parámetros | RepositoryResponse[] remoto |
| POST /repository/registry | No | projectId, id, name, gitUrl, cloneUrl | CreateRepositoryResponse |
| POST /repository/clone | Sí | cloneUrl | `{pathSystem:string}` |

No hay rutas HTTP para listar la tabla local, leer por id, editar, eliminar, desvincular, seleccionar rama, actualizar copia local o consultar progreso. Listado y clone utilizan request.user.id del JWT; no se acepta userId en sus cuerpos.

## GET /repository/all

```http
GET /repository/all
Authorization: Bearer <JWT>
```

Consulta GitHub usando la conexión local. Un elemento ilustrativo de data:

```json
{
  "id": 235,
  "name": "equipo/catalogo",
  "private": true,
  "description": "Servicios del catálogo",
  "language": "TypeScript",
  "gitUrl": "git://github.com/equipo/catalogo.git",
  "cloneUrl": "https://github.com/equipo/catalogo.git",
  "updatedAt": "2026-10-10T12:00:00Z"
}
```

No acepta paginación del cliente, y el servidor solicita solo per_page=100. No contiene projectIds ni rutas de disco. El array puede estar vacío y aun ser una respuesta exitosa.

## POST /repository/registry

```http
POST /repository/registry
Content-Type: application/json

{
  "projectId": 1,
  "id": 235,
  "name": "equipo/catalogo",
  "gitUrl": "git://github.com/equipo/catalogo.git",
  "cloneUrl": "https://github.com/equipo/catalogo.git"
}
```

projectId e id deben ser numbers enteros positivos; strings numéricos no pasan. Las tres cadenas se recortan y deben tener contenido. gitUrl y cloneUrl no se validan como URLs en este endpoint. El nombre no necesita formato owner/repo.

El proyecto debe existir. No se verifica propietario ni acceso GitHub. Este método no tiene JwtAuthGuard; tampoco hay guard de clase ni global en AppModule. Guarda o actualiza un registro por id y agrega el proyecto. Devuelve los mismos cinco campos con las cadenas persistidas; projectId representa el vínculo solicitado, no una propiedad escalar del modelo actual Repository.

## POST /repository/clone

```http
POST /repository/clone
Authorization: Bearer <JWT>
Content-Type: application/json

{"cloneUrl":"https://github.com/equipo/catalogo.git"}
```

Exige URL HTTPS con hostname github.com y nombre final válido según el caso de uso. No exige projectId ni repositoryId. La respuesta 201 también se utiliza cuando solo se reutiliza un destino existente.

```json
{
  "success": true,
  "data": {"pathSystem":"/backend/repo/ana/catalogo"},
  "error": null,
  "meta": null
}
```

La ruta es del servidor y su forma depende del sistema operativo y cwd. No representa una URL descargable ni una carpeta creada en el navegador del usuario.

## Errores

| Estado | Operación y causa |
|---|---|
| 400 | Registro con ids/cadenas inválidos; cloneUrl, username o destino inválidos |
| 401 | JWT ausente o inválido en all/clone |
| 404 | Proyecto inexistente al registrar; conexión GitHub ausente al listar/clonar |
| 409 | cloneUrl ya vinculado al proyecto, detectado antes de upsert |
| 502 | Respuesta HTTP no exitosa de GitHub al listar |
| 500 | Descifrado, Prisma, error de ejecución Git/clone, errores de red/JSON no traducidos o tipos runtime incorrectos en trim |

La envoltura de error contiene success false, data null, error con code/message y meta null. Un fallo de permisos de clonación se expresa como 500 del adaptador, no como 401/403 específico de GitHub. Los DTO Swagger describen campos, pero no aplican validación runtime. Véase [[Autenticacion - JWT cookie y cifrado]] para cookie access_token y Bearer.

Volver a [[Repository - Indice]].
''', ['src/repository/presentation/repository.controller.ts', 'src/repository/application/dto/create-repository.dto.ts', 'src/repository/application/dto/clone-repository.dto.ts', 'packages/shared/src/repository/responses/repository.response.ts', 'packages/shared/src/repository/responses/create-repository.response.ts', 'packages/shared/src/repository/responses/clone-repository.response.ts', 'src/shared/presentation/interceptors/api-response.interceptor.ts', 'src/shared/presentation/filters/api-exception.filter.ts', 'src/main.ts', 'src/app.module.ts'])

note('Uso y frontend', '''# Repository · uso y frontend

## Servicio y caché

repositoryService expone getAll para GET /repository/all y create para POST /repository/registry. No expone clone: la clonación que usa la interfaz se produce a través del análisis de proyectos en el backend.

`useRepositories` mantiene una query con clave `['repositories']`. La función solicita el catálogo remoto y lanza Error si success es falso o falta data. Aplica toRepository para presentar updatedAt como fecha localizada es-MX con día, mes corto y año. Ese campo mostrado deja de ser el ISO original; no es la fecha de un vínculo Project ni del clone local.

El hook devuelve allRepositories, isLoading, isError, error y createRepository. No declara polling, timeout, retry o staleTime propios, ni expone aquí un método refresh. La clave no incluye userId; su aislamiento entre sesiones depende del manejo general de la caché, no de este hook.

La mutación createRepository valida con Zod ids enteros positivos y cadenas recortadas no vacías. Retorna la respuesta del servicio sin comprobar success ni invalidar queries automáticamente. En el recorrido de creación de proyectos, `useProjectCreation` llama repositoryService.create directamente y comprueba success; no atraviesa esa mutación Zod.

## Selección y búsqueda

RepositoriesProvider mantiene query y selectedIds como Set. Aunque su estado inicial también declara status, repositories y message, los datos de servidor y flags de carga visibles proceden de React Query; el reducer no tiene acciones que carguen o fallen el catálogo.

| Acción | Cambio |
|---|---|
| query-changed | Modifica texto de búsqueda |
| repository-toggled | Copia el Set y agrega o elimina un id |
| visible-repositories-toggled | Si todos los ids recibidos estaban elegidos, los elimina; si no, los agrega |
| selection-cleared | Vacía el Set y message; conserva query |

`getVisibleRepositories` aplica trim y lowerCase al texto y filtra por inclusión en nombre o descripción. Es búsqueda local sobre la página ya descargada, no una búsqueda GitHub. No puede encontrar repositorios omitidos por la falta de paginación.

Seleccionar todos afecta solo a los ids visibles; las selecciones fuera del filtro se conservan. `useSelectedRepositories` cruza selectedIds con allRepositories, conservando el orden del catálogo. Si un id seleccionado desaparece del catálogo, no produce un objeto seleccionado, aunque siga en el Set y en el contador visual basado en su tamaño.

## Panel y proyectos

RepositorySelectionContainer combina datos de autenticación, catálogo, filtro, selección y conteos de proyectos. El panel muestra carga, error o lista, además del número de resultados descargados. La selección múltiple se deshabilita cuando carga, hay error o no hay filas visibles.

Nuevo Proyecto se habilita con un Set no vacío; el handler de Project comprueba que exista al menos un objeto de repositorio seleccionado. Limpiar llama al recorrido de Project que borra selección, error y formulario de creación, conservando el filtro de repositorios.

El conteo “en proyectos” se calcula cruzando los resúmenes de repositorios de todos los proyectos cargados. No se obtiene de GitHub ni refleja cantidad de clones locales. [[Project - Uso y frontend]] documenta ese estado y los fallbacks cuando faltan metadatos remotos.

## Del catálogo a un proyecto

1. El usuario selecciona repositorios del catálogo GitHub.
2. El frontend crea un Project.
3. Por cada selección envía projectId y los metadatos remotos a registry de Repository, de manera secuencial.
4. Cuando todos los registros responden success, llama POST /project/init.
5. El backend clona o reutiliza rutas y busca Compose.

Un fallo intermedio deja persistidos los vínculos anteriores. No hay rollback ni desvinculación HTTP para revertirlos. El frontend refresca proyectos en ese caso; consultar [[Project - Repositorios e inicializacion]].

`shortName` toma el último segmento separado por `/`. Los helpers Compose usan ese nombre corto para relacionar directorios clonados, de modo que la pérdida del owner también afecta a la asociación visual de rutas.

Volver a [[Repository - Indice]].
''', ['apps/web/src/features/repositories/repository.service.ts', 'apps/web/src/features/repositories/use-repositories.ts', 'apps/web/src/features/repositories/create-repository.schema.ts', 'apps/web/src/features/repositories/repository.mapper.ts', 'apps/web/src/features/repositories/repositories.reducer.ts', 'apps/web/src/features/repositories/repositories.context.tsx', 'apps/web/src/features/repositories/use-repository-selectors.ts', 'apps/web/src/features/repositories/repository-selection.helpers.ts', 'apps/web/src/features/repositories/repository-name.ts', 'apps/web/src/pages/views/repository-selection-container.tsx', 'apps/web/src/features/repositories/components/repository-selection-panel.tsx', 'apps/web/src/features/projects/hooks/use-project-creation.ts'])

note('Diagnostico y pruebas', '''# Repository · diagnóstico y pruebas

## Configuración y dependencias

| Dependencia | Uso |
|---|---|
| DATABASE_URL | Prisma: metadatos, proyectos y conexión GitHub |
| ENCRYPTION_SECRET_KEY | Clave Base64 de 32 bytes para descifrar credenciales |
| JWT y conexión OAuth | Identidad local y acceso GitHub para all/clone |
| git disponible en PATH | Ejecutable invocado por el adaptador |
| Soporte para askpass.sh | Helper con shebang /bin/sh |
| cwd del backend | Raíz repo usada para clones |
| Permisos de disco y directorio temporal | Crear padres del destino y ASKPASS, eliminar temporales |
| Acceso de red | GitHub API y clone HTTPS |
| VITE_API_URL | Dirección del backend desde el frontend |

No hay variable propia para la raíz de clones, ejecutable Git, rama o timeout de este módulo. El entorno del proceso Git hereda process.env, además de las variables de ASKPASS. La inicialización global del backend tiene dependencias adicionales descritas en [[Startup - Indice]].

## Diagnóstico por síntoma

| Síntoma | Causa compatible con el código | Revisar |
|---|---|---|
| Faltan repositorios del catálogo | Solo una página per_page=100 o acceso remoto limitado | Request remoto y credenciales |
| Registro existe pero no aparece en all | all consulta GitHub, no Repository | Diferencia entre catálogo y tabla local |
| Se puede registrar sin sesión | registry no tiene guard | Decoradores del controlador |
| 404 al listar/clonar con JWT | Falta GitHubConnection | Relación por userId |
| 502 al listar | GitHub retornó HTTP no exitoso | Estado de acceso remoto; el mensaje local es genérico |
| 500 al descifrar | Clave o payload incompatible | Cifrado de Autenticacion |
| No fue posible ejecutar Git | Evento error al iniciar el proceso | PATH y disponibilidad del ejecutable |
| Clone devuelve error con stderr | Git terminó con código distinto de cero | URL, permisos, red, ASKPASS o destino |
| Cambios remotos no aparecen | Destino existente se devuelve sin pull/fetch | Copia local y su origen |
| Dos owners dan la misma ruta | Destino usa nombre corto y username autenticado | Colisión owner/repo |
| Existe carpeta pero falla análisis | access no verifica `.git` ni integridad | Contenido real del destino |
| Un clone fallido se reutiliza después | El adaptador no limpia destination | Directorio parcial que siga existiendo |
| Dos clones concurrentes fallan | Sin lock sobre el destino | Requests en curso y misma ruta |
| Un repositorio aparece en varios proyectos | Relación muchos a muchos y connect acumulativo | Vínculos ORM |
| Un vínculo duplicado devuelve 409 | Validación previa de projectId+cloneUrl | Completar solo vínculos faltantes |
| Entorno nuevo falla al consultar relaciones | Diferencias entre migraciones históricas y modelo | [[Repository - ORM y vinculacion]] |

## Ejemplos de ramas

1. **Vínculo a dos proyectos:** registrar id 235 y la misma URL en Project 1, luego Project 2, agrega ambos vínculos al mismo registro. La segunda respuesta contiene projectId 2, no todo el array de asociaciones.
2. **Mismo vínculo repetido:** registrar de nuevo ese cloneUrl en Project 1 devuelve 409 antes de upsert.
3. **URL no válida para clonar:** registry acepta una cadena no vacía con formato distinto, pero clone aplica su validación HTTPS GitHub y puede devolver 400.
4. **Carpeta existente y token revocado:** clone puede devolver la ruta sin usar el token remoto, siempre que exista la conexión local y el destino sea accesible. Eso no demuestra acceso actual a GitHub.
5. **Sin conexión y carpeta existente:** clone devuelve 404 porque busca conexión antes de revisar el destino.
6. **Owners diferentes:** equipo-a/api y equipo-b/api, para username ana, generan el mismo destino repo/ana/api. El segundo request puede reutilizar el contenido del primero.
7. **Fallo durante un análisis paralelo:** Promise.all puede rechazar mientras otros procesos Git continúan. No hay compensación de clones completados ni transacción con la base de datos.

Son ejemplos inferidos de condiciones del código, no resultados de operaciones ejecutadas.

## Pruebas y verificación

No se encontraron specs dedicados al CRUD de Repository, GetRepositoriesUseCase, CloneRepositoryUseCase o GitCloneRepositoryService en src/repository, src/shared/infrastructure/git y los tests revisados. ProjectAnalysisService sí tiene pruebas del consumidor del clonador, pero no equivalen a una integración real con GitHub, Git, ASKPASS y Prisma. Algunas pruebas de frontend de Deployment usan objetos Repository para verificar la configuración Compose.

Casos relevantes para pruebas futuras: mapeo de nulos del catálogo, errores de conexión/HTTP, vínculos compartidos y duplicados, URLs y username inválidos, destino existente, colisiones de nombre corto, errores del proceso Git y limpieza del helper temporal. Una comprobación del listado debe distinguir registros locales de datos remotos.

La verificación de esta entrega revisó las fuentes, los enlaces internos, las rutas de archivos fuente y los bloques Markdown, además de comparar la copia del vault con los archivos generados. No se ejecutaron pruebas de aplicación, requests, clones ni migraciones. No confirma el estado real de la base de datos o de las credenciales.

Volver a [[Repository - Indice]].
''', ['src/repository/application/use-cases/repository/get-repositories.use-case.ts', 'src/repository/application/use-cases/repository/clone-repository.use-case.ts', 'src/repository/application/use-cases/repository/create-repository.use-case.ts', 'src/shared/infrastructure/git/git-repository-cloner.service.ts', 'src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts', 'src/analisys/application/project-analysis.service.spec.ts', 'test/frontend-deployment-request.spec.ts'])

known = set(notes) | {p.stem for p in vault.rglob('*.md')}
for title, (body, sources) in notes.items():
    assert body.count('```') % 2 == 0, title
    for target in re.findall(r'\[\[([^\]|]+)', body):
        assert target in known, (title, target)
    for source in sources:
        assert (repo / source).is_file(), source
    front = '---\ntags:\n  - neoglito\n  - repository\n  - documentacion-tecnica\nfuncionalidad: Repository\nactualizado: 2026-10-10\n---\n\n'
    footer = '\n## Fuentes del código\n\n' + '\n'.join(f'- [{source}]({(repo / source).as_uri()})' for source in sources) + '\n'
    (out / (title + '.md')).write_text(front + body + footer, encoding='utf-8')
print(f'{len(notes)} notas generadas y verificadas en {out}')
