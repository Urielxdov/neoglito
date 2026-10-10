from pathlib import Path
import re, json

base = Path(__file__).resolve().parent
repo = base.parent.parent
out = base / 'Shared'
out.mkdir(exist_ok=True)
vault = Path('C:/Users/Uriel-Galvan/Documents/neoglito/neoglito')
notes = {}

def note(title, body, sources):
    notes['Shared - ' + title] = (body, sources)

note('Indice', '''# Shared · documentación técnica

Shared reúne piezas transversales del proyecto. No hay un `SharedModule` único: el código está repartido entre backend, paquete de contratos y frontend, con responsabilidades y mecanismos de consumo distintos.

Documentación inferida del código revisado el **10 de octubre de 2026**. No se ejecutaron Redis, Git, peticiones HTTP, migraciones ni pruebas de aplicación para redactarla.

## Áreas

| Ruta | Responsabilidad | Consumidores |
|---|---|---|
| src/shared/application | Puertos y normalización de datos Compose | Casos de uso del backend |
| src/shared/infrastructure | Implementaciones Redis, archivos, YAML, Git y cifrado | Módulos que registran proveedores |
| src/shared/presentation | Envoltura HTTP, errores, request autenticado y Swagger | Bootstrap y controladores |
| packages/shared | Contratos TypeScript y normalización de texto | Backend y frontend |
| apps/web/src/shared | Cliente HTTP, contextos, tema, fechas e identidad visual | Features y layout web |

## Recorrido

1. [[Shared - Arquitectura y consumidores]]: registros de proveedores y alcance real.
2. [[Shared - Puertos y contratos internos]]: métodos, entradas y resultados.
3. [[Shared - Busqueda de archivos]]: comparación de los dos buscadores.
4. [[Shared - Extraccion Compose]]: variables, interpolación y normalización de puertos.
5. [[Shared - Redis y cache]]: conexión, ciclo de vida, operaciones y TTL.
6. [[Shared - Cifrado y Git]]: implementaciones y límites de responsabilidad.
7. [[Shared - HTTP errores y Swagger]]: flujo HTTP, envolturas y documentación.
8. [[Shared - Paquete de contratos]]: exports, requests y responses compartidos.
9. [[Shared - Cliente HTTP frontend]]: transporte, errores y consumo.
10. [[Shared - Estado utilidades y branding]]: contextos, tema, fechas, iconos y splash.
11. [[Shared - Diagnostico pruebas y extension]]: límites, pruebas existentes y mantenimiento.

Shared no posee controladores de negocio ni modelos Prisma propios. Redis y filesystem son persistencia utilizada por implementaciones compartidas; los modelos User, GitHubConnection, Project y Deployment pertenecen a los módulos funcionales. Los endpoints se explican en [[Autenticacion - Indice]], [[Project - Indice]], [[Repository - Indice]], [[Analisis - Indice]], [[Deployment - Indice]] y [[Ports - Indice]].
''', ['src/main.ts', 'src/shared/infrastructure/cache/cache.module.ts', 'packages/shared/package.json', 'apps/web/src/shared/api/contracts.ts'])

note('Arquitectura y consumidores', '''# Shared · arquitectura y consumidores

## Organización y registro

Estar en shared no registra automáticamente un servicio en Nest. Los módulos funcionales enlazan los tokens con sus implementaciones; los helpers de presentación se instalan en bootstrap o se aplican en controladores.

| Pieza | Registro actual | Consumidor efectivo |
|---|---|---|
| FILE_FINDER_PORT → RecursiveFileFinderService | AnalysisModule, useClass | ProjectAnalysisService |
| ENVIROMENT_VARIABLE_EXTRACT_PORT → YamlComposeEnviromentVariableExtractService | AnalysisModule, useClass | ProjectAnalysisService |
| COMPOSE_PORT_EXTRACT_PORT → YamlComposePortExtractService | AnalysisModule, useClass | ProjectAnalysisService |
| ENCRYPTION_PORT → Aes256GcmEncryptionService | AuthModule y RepositoryModule, useClass | OAuth, listado GitHub y clonación |
| GIT_CLONER_PORT → GitCloneRepositoryService | RepositoryModule, useClass | CloneRepositoryUseCase |
| CACHE_PORT → RedisCache | CacheModule, useExisting | API genérica disponible; no se encontró inyección actual del token en casos de uso |
| RedisConnection | CacheModule; exportado directamente | RedisPortReservationService |
| ApiResponseInterceptor y ApiExceptionFilter | main con useGlobalInterceptors/useGlobalFilters | Respuestas HTTP del backend |
| ApiSuccessResponseDoc | Decoradores de controladores | Esquema Swagger |

CacheModule exporta CACHE_PORT y RedisConnection. La reserva de puertos usa el cliente Redis directamente para scripts y claves propias; no pasa por RedisCache. AnalysisModule exporta ProjectAnalysisService, no todos sus proveedores internos. RepositoryModule exporta CloneRepositoryUseCase.

```mermaid
flowchart LR
    A[AnalysisModule] --> F[Buscador y extractores shared]
    R[RepositoryModule] --> G[Git y cifrado shared]
    AU[AuthModule] --> E[Cifrado shared]
    P[PortModule] --> C[CacheModule]
    C --> RC[RedisConnection]
    M[main] --> H[Interceptor y filtro shared]
    B[Backend] --> T[packages/shared contratos]
    W[Frontend] --> T
    W --> WS[apps/web shared]
```

## Implementaciones presentes sin conexión al flujo activo

FindDockerFilesUseCase, FIND_FILES_PORT y FileSystemFindFilesService existen, pero en los registros/imports revisados no se encontró su instalación como proveedores para el análisis actual. ProjectAnalysisService utiliza FILE_FINDER_PORT y RecursiveFileFinderService con una regex más restringida.

normalizeText se exporta en packages/shared; no se encontraron llamadas en src ni en el frontend revisado. Su existencia no significa que todos los nombres o búsquedas se normalicen con ese helper.

## ORM y endpoints

Shared no define modelos Prisma ni un controlador HTTP. EncryptionPort recibe strings; Git recibe credenciales ya obtenidas; los extractores reciben rutas; Redis recibe claves. La lectura de GitHubConnection o escritura de Project/Deployment la hacen consumidores externos.

AuthenticatedRequest extiende Request de Express con user `{id, username}`. Es un contrato de tipos; no autentica ni valida la presencia de user. JwtAuthGuard y la estrategia del módulo Auth aportan el dato en las rutas protegidas.

## Alcance del paquete común

packages/shared contiene contratos transportables entre procesos; src/shared contiene dependencias del servidor como filesystem, crypto, Redis y Nest. apps/web/src/shared contiene dependencias del navegador y React. Importar implementaciones del servidor en el frontend mezclaría esas responsabilidades; el flujo actual reutiliza interfaces mediante `@neoglito/shared`.

Volver a [[Shared - Indice]].
''', ['src/analisys/analysis.module.ts', 'src/auth/auth.module.ts', 'src/repository/repository.module.ts', 'src/ports/port.module.ts', 'src/ports/infrastructure/reservations/redis-port-reservation.service.ts', 'src/shared/presentation/http/authenticated-request.ts', 'src/main.ts', 'packages/shared/src/index.ts'])

note('Puertos y contratos internos', '''# Shared · puertos y contratos internos

Los tokens de inyección son Symbols exportados. Un consumidor importa el mismo token y declara `@Inject(TOKEN)`; el tipo de interfaz describe la dependencia para TypeScript. Los contratos no hacen validación runtime por sí mismos.

| Token | Operaciones | Resultado |
|---|---|---|
| CACHE_PORT | get(key), getAll(), set(key,value,ttl?), delete(key), exists(key) | Strings/null, mapa, void o boolean |
| ENCRYPTION_PORT | encrypt(string), decrypt(string) | Promise de string |
| GIT_CLONER_PORT | clone(cloneUrl,username,accessToken,destination) | Promise de ruta string |
| FILE_FINDER_PORT | findFile(directoryPath,RegExp) | Promise de string[] |
| FIND_FILES_PORT | findFiles(rootPath,readonly string[] patterns) | Promise de string[] |
| ENVIROMENT_VARIABLE_EXTRACT_PORT | analyze(filePath) | ComposeAnalysis |
| COMPOSE_PORT_EXTRACT_PORT | analyze(filePath) | ComposePortAnalysis |

Los dos contratos de búsqueda no son intercambiables: uno recibe RegExp contra ruta relativa normalizada; el otro patrones de nombres que su adaptador convierte a regex. [[Shared - Busqueda de archivos]] compara resultados y exclusiones.

## Resultado de variables

ComposeAnalysis contiene environmentVariables. Cada EnvironmentVariable posee service, name, source literal/interpolation, value string o null y defaultValue string o null. En interpolaciones, value expresa el nombre de variable referenciada, no el valor efectivo del entorno.

Los nombres `EnviromentVariableExtractPort`, `ENVIROMENT_VARIABLE_EXTRACT_PORT` y `YamlComposeEnviromentVariableExtractService` conservan el typo del código. Para importar o reemplazar proveedores debe utilizarse la grafía real.

## Resultado de puertos

ComposePortAnalysis contiene ports. Cada ComposePort posee service:string, hostIp:string|null, publishedPort:string|null, targetPort:string, protocol:string y mappingType one-to-one/range.

Los puertos son strings porque pueden contener rangos o expresiones sin resolver. protocol no es una unión tcp/udp en este contrato; puede contener otro texto. publishedPort null expresa ausencia de publicación fija en el dato extraído. Ningún campo demuestra que el puerto esté disponible o responda.

El helper parseComposePort normaliza una entrada y devuelve ComposePort o null; isRecord identifica objetos no nulos y no arrays. Además del extractor, Deployment importa estos helpers al preparar y modificar Compose.

## Errores y capacidades

Las firmas Promise no especifican una jerarquía de errores. Los adaptadores filesystem/YAML pueden propagar errores de lectura o parseo; cifrado usa Error; Git envuelve sus fallos de proceso en InternalServerErrorException; Redis puede propagar errores del cliente y RangeError para TTL inválido.

No hay contratos compartidos para transacciones entre filesystem, Redis y Prisma, cancelación de Git, paginación de getAll o resolución completa de Compose. Esas capacidades no deben inferirse de los nombres de los puertos.

Volver a [[Shared - Indice]].
''', ['src/shared/application/cache.port.ts', 'src/shared/application/encryption.port.ts', 'src/shared/application/repository-cloner.port.ts', 'src/shared/application/file-finder.port.ts', 'src/shared/application/find-files.port.ts', 'src/shared/application/enviroment-variable-extract.port.ts', 'src/shared/application/compose-port-extract.port.ts', 'src/shared/application/compose-ports.ts'])

note('Busqueda de archivos', '''# Shared · búsqueda de archivos

## Buscador usado en análisis

RecursiveFileFinderService.findFile(directoryPath, pattern) resuelve la raíz a absoluta y recorre directorios con readdir y withFileTypes. Para cada archivo construye la ruta relativa a la raíz, cambia separadores nativos a `/`, reinicia pattern.lastIndex a 0 y prueba la regex. Retorna las rutas absolutas de los archivos que coinciden.

El recorrido es secuencial dentro de cada directorio y recursivo. No excluye .git, node_modules, dist ni carpetas ocultas. No ordena resultados explícitamente. Solo visita entradas isDirectory y acepta entradas isFile: las entradas symlink no se siguen por esa comprobación de Dirent.

```mermaid
flowchart TD
    A[resolve raíz] --> B[readdir con Dirent]
    B --> C{Tipo de entrada}
    C -->|Directorio| B
    C -->|Archivo| D[Ruta relativa con separadores slash]
    D --> E[Reset lastIndex y test RegExp]
    E -->|Coincide| F[Agregar ruta absoluta]
    C -->|Otro tipo| G[Omitir]
```

ProjectAnalysisService pasa `/(^|\\/)docker-compose.*\\.yml$/`, sensible a mayúsculas. Admite docker-compose.yml y variantes .yml; no descubre compose.yml, compose.yaml, docker-compose.yaml ni Dockerfiles. El nombre genérico del servicio no limita esa capacidad: la restricción viene de la regex del consumidor.

## Buscador alternativo

FileSystemFindFilesService.findFiles(rootPath, patterns) convierte cada patrón en una regex anclada y case-insensitive. Escapa metacaracteres y transforma `*` en `.*`. Compara contra entry.name, no contra la ruta relativa completa.

Ignora directorios con nombres exactos .git, node_modules, .next, dist y build. Visita entradas mediante Promise.all y acumula coincidencias; al final las ordena con localeCompare. Usa join sobre la raíz recibida sin resolverla a absoluta, por lo que una raíz relativa produce rutas relativas al proceso. Tampoco sigue entradas symlink.

FindDockerFilesUseCase recibe este puerto y busca Dockerfile, Dockerfile.*, docker-compose.yml/.yaml, docker-compose.*.yml/.yaml y compose.yml/.yaml. Luego transforma cada ruta encontrada a relativa respecto a repositoryPath usando path.relative, con separadores del sistema operativo.

No se encontró registro activo de FIND_FILES_PORT/este caso de uso en el análisis actual. Sus patrones amplios y exclusiones no describen el comportamiento efectivo de ProjectAnalysisService.

## Comparación

| Propiedad | RecursiveFileFinderService | FileSystemFindFilesService |
|---|---|---|
| Entrada de filtro | RegExp | Array de patrones simples |
| Texto comparado | Ruta relativa con slash | Nombre del archivo |
| Mayúsculas | Según flags recibidos | Insensible |
| Carpetas ignoradas | Ninguna | Cinco nombres definidos |
| Ejecución del recorrido | Secuencial | Promise.all por nivel |
| Orden final | Sin sort propio | localeCompare |
| Ruta de retorno | Absoluta | Depende de rootPath recibido |
| Consumidor actual | ProjectAnalysisService | No encontrado en flujo activo |

Ambos propagan errores de readdir: no saltan automáticamente carpetas con permisos insuficientes ni retornan resultados parciales ante un fallo. No tienen límites de profundidad, cantidad de archivos o timeout propios.

Las pruebas del buscador activo crean archivos temporales y verifican coincidencia por ruta relativa y reinicio de regex con flag g. Se revisaron, no se ejecutaron.

Volver a [[Shared - Indice]].
''', ['src/shared/infrastructure/files/recursive-file-finder.service.ts', 'src/shared/infrastructure/file-system/file-system-find-files.service.ts', 'src/shared/application/find-docker-files.ts', 'src/analisys/application/project-analysis.service.ts', 'src/shared/infrastructure/files/recursive-file-finder.service.spec.ts'])

note('Extraccion Compose', '''# Shared · extracción Compose

## Pipeline común

Ambos extractores reciben filePath, leen UTF-8 y llaman parse de yaml con merge true. El análisis requiere un documento objeto con services objeto. Si esa estructura no existe, retorna arrays vacíos. Errores de lectura o YAML inválido se propagan; no se traducen a una excepción HTTP propia aquí.

```mermaid
flowchart LR
    F[Archivo YAML] --> P[parse con merge true]
    P --> S[Validar estructura services]
    S --> E[Extraer environment]
    S --> O[Extraer ports]
    E --> R[Contratos normalizados]
    O --> R
```

ProjectAnalysisService coordina las dos lecturas por archivo mediante Promise.all; cada extractor lee y parsea independientemente. Con includePorts false no llama al extractor de puertos. No hay caché de YAML ni escritura del documento por estas clases.

## Variables: mapa y lista

El extractor recorre solo services.<nombre>.environment. En mapa serializa string, number y boolean con String; null/undefined u objetos/arrays se convierten a null y luego a una interpolación con el nombre de la entrada.

En lista ignora entradas no string. Divide una cadena en el primer `=`: el resto completo es el valor. Una entrada sin `=` representa interpolación del mismo nombre. No recorta nombres ni valores ni valida un regex de nombres environment.

| Entrada ilustrativa | source | value | defaultValue |
|---|---|---|---|
| MODE: production | literal | production | null |
| ENABLED: true | literal | true, como string | null |
| EMPTY: null | interpolation | EMPTY | null |
| PORT: ${APP_PORT:-3000} | interpolation | APP_PORT | 3000 |
| SECRET: ${TOKEN?mensaje} | interpolation | TOKEN | null |
| Lista OPTIONAL_SECRET sin = | interpolation | OPTIONAL_SECRET | null |
| Lista TOKEN=a=b | literal | a=b | null |

La salida conserva service y name de la entrada, que pueden diferir de value. Los valores de ejemplo son resultados de reglas del código, no expansión real del entorno.

## Interpolación detectada

Busca la primera expresión con llaves `${VARIABLE}`, con operadores opcionales `:-`, `-`, `:?` o `?`. Solo `:-` y `-` producen defaultValue. No conserva una distinción entre vacío y ausente ni ejecuta los errores que Compose asociaría a los operadores de requisito.

La regex con llaves no está anclada al valor completo. En `postgres://${DB_USER}:${DB_PASSWORD}@db`, captura primero DB_USER y pierde en la salida la estructura del string y las demás referencias. La variante `$VARIABLE` sin llaves solo se detecta cuando ocupa toda la cadena. No implementa expresiones anidadas, todas las reglas de escape ni sustitución de `.env` o process.env.

No analiza env_file, variables de build args, command, labels ni otros campos Compose. Los objetos environment inválidos pueden convertirse en una interpolación en vez de generar un error explícito de esquema.

## Puertos: extracción y normalización

YamlComposePortExtractService recorre services y sus ports solo si son arrays. Para cada entrada llama parseComposePort; descarta las que devuelven null.

En string/number separa por `/` para protocolo (default tcp), por `:` para target al final, published penúltimo y hostIp como unión de segmentos anteriores. En sintaxis larga exige target string/number y published ausente/null/string/number, toma host_ip solo si es string y protocol string o tcp.

| Entrada | hostIp | publishedPort | targetPort | protocol |
|---|---|---|---|---|
| 3000 | null | null | 3000 | tcp |
| 8080:80 | null | 8080 | 80 | tcp |
| 127.0.0.1:8080:80/udp | 127.0.0.1 | 8080 | 80 | udp |
| 8000-8002:80-82 | null | 8000-8002 | 80-82 | tcp |
| ${PORT}:3000 | null | ${PORT} | 3000 | tcp |

Todas esas cifras se devuelven como strings. mappingType es range si published o target coincide con dígitos-guion-dígitos; en otros casos one-to-one. No expande rangos ni verifica orden, correspondencia de longitudes, rango 1–65535 o protocolos permitidos. Un texto target no vacío puede normalizarse aunque Docker no lo acepte.

No realiza una comprobación integral de sintaxis IPv6. Las expresiones permanecen sin resolver. No extrae expose ni comprueba disponibilidad de puertos. Opciones largas como mode/name no están en el resultado normalizado; Deployment conserva/modifica el YAML mediante su propio preparador.

parseComposePort también se usa en la preparación de Deployment, pero la validación posterior de edición, reservas y modo espejo es independiente. Consultar [[Analisis - Variables y puertos]], [[Deployment - Preparacion Compose]] y [[Ports - Indice]].

Volver a [[Shared - Indice]].
''', ['src/shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.ts', 'src/shared/infrastructure/compose/yaml-compose-port-extract.service.ts', 'src/shared/application/compose-ports.ts', 'src/analisys/application/project-analysis.service.ts', 'src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts'])

note('Redis y cache', '''# Shared · Redis y caché

## Registro y ciclo de vida

CacheModule registra RedisConnection y RedisCache como proveedores concretos. CACHE_PORT usa useExisting RedisCache, por lo que ambos identificadores acceden a la misma instancia de caché en ese registro. Exporta CACHE_PORT y RedisConnection.

RedisConnection crea su cliente con REDIS_URL o redis://localhost:6379. Instala un listener error que escribe al logger. onModuleInit espera client.connect; onModuleDestroy llama quit si isOpen es true. No hay catch que convierta una conexión fallida en caché opcional ni configuración propia de fallback.

```mermaid
sequenceDiagram
    participant N as Ciclo Nest
    participant C as RedisConnection
    participant R as Redis
    N->>C: onModuleInit
    C->>R: connect
    R-->>C: Conexión lista
    Note over C,R: Operaciones mediante client
    N->>C: onModuleDestroy
    C->>C: Comprobar isOpen
    C->>R: quit si abierto
```

El hook de destrucción define cómo cerrar el recurso cuando Nest destruye el módulo. Main no habilita explícitamente enableShutdownHooks; no debe asumir que todo tipo de señal o terminación abrupta ejecuta ese cierre.

## Operaciones de RedisCache

| Método | Redis | Observaciones |
|---|---|---|
| get(key) | GET | string o null |
| set(key,value) | SET sin opciones | No conserva explícitamente un TTL anterior |
| set(key,value,ttl) | SET con EX | ttl entero positivo en segundos |
| delete(key) | DEL | Retorna void, no cantidad eliminada |
| exists(key) | EXISTS | true solo si respuesta es 1 |
| getAll() | SCAN COUNT 100 y MGET por lote | Mapa de claves a strings no nulos |

TTL undefined elige SET simple. Cero, negativos, fracciones y otros valores no enteros provocan RangeError “Redis cache TTL must be a positive number of seconds”. No se redondea el TTL. No hay serialización JSON automática: el contrato trabaja con strings.

## getAll y alcance de claves

scanIterator no tiene MATCH ni namespace. Visita las claves del database seleccionado por la conexión y hace mGet del lote. Ignora valores null/undefined, acumula pares y retorna Object.fromEntries. No devuelve una instantánea transaccional; claves pueden cambiar o expirar durante el recorrido. Si una clave se repite durante scan, el objeto final conserva la última asignación acumulada.

COUNT 100 es un parámetro de recorrido, no paginación de API ni límite del total. El resultado y los pares se mantienen en memoria; no existe límite global. Claves con datos no compatibles con GET/MGET no se transforman a objetos de caché de otros tipos.

## Relación con reservas

RedisPortReservationService inyecta RedisConnection y usa raw client, eval y su propio MATCH para owner keys. RedisCache.getAll no es el algoritmo usado por GET /port. Reservas añaden invariantes y scripts que este CachePort genérico no implementa.

No se encontró un consumidor actual que inyecte CACHE_PORT en casos de uso. El proveedor está disponible, pero no debe atribuirle la caché de React Query ni la lógica de reservas. [[Ports - Redis y ORM]] explica las claves y consistencia, y [[Startup - ORM y Redis]] la restauración al arrancar.

Volver a [[Shared - Indice]].
''', ['src/shared/infrastructure/cache/cache.module.ts', 'src/shared/infrastructure/cache/redis-connection.service.ts', 'src/shared/infrastructure/cache/redis-cache.service.ts', 'src/shared/application/cache.port.ts', 'src/ports/infrastructure/reservations/redis-port-reservation.service.ts', 'src/main.ts'])

note('Cifrado y Git', '''# Shared · cifrado y Git

## AES-256-GCM

Aes256GcmEncryptionService implementa EncryptionPort. El constructor exige ENCRYPTION_SECRET_KEY Base64 que decodifique a 32 bytes. Una clave ausente o de otra longitud provoca Error al construir el proveedor.

encrypt genera IV aleatorio de 12 bytes, cifra texto UTF-8 con AES-256-GCM y obtiene tag de autenticación de 16 bytes. Devuelve `v1.iv.tag.ciphertext`, con los tres componentes binarios en Base64URL. No escribe en base de datos: el consumidor persiste ese string.

decrypt separa componentes, exige versión v1, IV y tag presentes, sin segmentos adicionales. Decodifica buffers y verifica longitudes de IV/tag. Luego configura el tag y descifra. Errores de formato usan “Invalid encrypted payload format”; fallos criptográficos dentro del try usan “Unable to decrypt payload”.

No hay rotación, identificador de clave, migración de versiones ni búsqueda de claves antiguas. Cambiar la clave sin transformar los payloads existentes puede impedir recuperar credenciales. El cifrado protege y autentica el contenido almacenado; no equivale al JWT que autentica requests HTTP.

AuthModule lo usa para guardar tokens GitHub; RepositoryModule lo usa para leerlos al listar o clonar. Consultar [[Autenticacion - JWT cookie y cifrado]] y [[Repository - GitHub y credenciales]].

## Adaptador Git

GitCloneRepositoryService implementa clone(cloneUrl, username, accessToken, destination). Su responsabilidad comienza con argumentos ya resueltos: no consulta Prisma, valida host ni decide si reutilizar el destino. Esas decisiones están en CloneRepositoryUseCase.

El pipeline crea un temporal github-clone- en tmpdir, escribe askpass.sh, crea el padre del destino, ejecuta Git y elimina el temporal en finally. El script responde a prompts Username/Password imprimiendo variables del entorno del hijo. No incluye literalmente el token en el archivo.

spawn ejecuta `git` con array `[clone, cloneUrl, destination]`, sin shell, con stdin/stdout ignorados y stderr capturado. Hereda process.env y agrega GIT_ASKPASS, GIT_USERNAME, GIT_PASSWORD y GIT_TERMINAL_PROMPT=0. Código 0 resuelve; otros códigos lanzan InternalServerErrorException con stderr. Un evento error produce “No fue posible ejecutar Git”.

No implementa timeout, cancelación, progreso, retry, límites de stderr, fetch/pull, branch, shallow clone o limpieza del destino fallido. El finally limpia solo el helper temporal; un fallo de esa limpieza puede propagarse. Tampoco configura windowsHide ni una variante de ASKPASS para otra shell.

El uso concreto puede reutilizar una carpeta existente sin llamar al adaptador. El destino usa username y nombre corto; los choques, URLs admitidas y fallos parciales están desarrollados en [[Repository - Clonacion paso a paso]].

## Persistencia y exposición

Shared no almacena credenciales por sí mismo. Los tokens cifrados pertenecen a GitHubConnection. Los clones son archivos locales y no tienen un estado persistido en Repository. El filtro HTTP puede devolver mensajes de Error y stderr tal como se construyen; estas clases no aplican redacción global de secretos a mensajes.

Volver a [[Shared - Indice]].
''', ['src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts', 'src/shared/application/encryption.port.ts', 'src/shared/infrastructure/git/git-repository-cloner.service.ts', 'src/shared/application/repository-cloner.port.ts', 'src/auth/auth.module.ts', 'src/repository/repository.module.ts'])

note('HTTP errores y Swagger', '''# Shared · HTTP, errores y Swagger

## Flujo de respuesta

main registra ApiExceptionFilter y ApiResponseInterceptor globalmente antes de listen. Las interfaces del paquete definen la forma común; las clases Nest producen esa forma durante la ejecución.

```mermaid
flowchart TD
    A[Controlador y caso de uso] -->|Retorna dato| B[ApiResponseInterceptor]
    B --> C{Objeto con url string?}
    C -->|Sí| D[Pasar dato sin envoltura]
    C -->|No| E[success true y data]
    A -->|Lanza excepción| F[ApiExceptionFilter]
    F --> G[Status HTTP y success false]
```

## Éxitos

El interceptor aplica map a next.handle y retorna `{success:true,data,error:null,meta:null}`. No añade paginación ni decide el código HTTP; este depende del controlador/Nest. No comprueba si el valor ya tenía una envoltura ApiResponse: un controlador que devolviera ese objeto también sería envuelto.

La excepción usa una comprobación estructural: cualquier objeto no nulo con propiedad url de tipo string pasa intacto. Esto permite el contrato de redirección OAuth, pero la condición no comprueba @Redirect ni statusCode. Un dato de negocio con campo url string también satisface esa regla.

## Errores

ApiExceptionFilter usa @Catch sin tipo, obtiene Response de Express y decide status: getStatus de HttpException o 500 para otros errores. Construye `{success:false,data:null,error,meta:null}` y ejecuta response.status(status).json(body).

| Forma de excepción | code | message/details |
|---|---|---|
| HttpException con respuesta string | Nombre del HttpStatus | La respuesta string |
| HttpException con respuesta objeto | response.error si string; en otro caso nombre del HttpStatus | message string, o array unido por coma; array también en details |
| Objeto HTTP sin message utilizable | Según regla anterior | Ocurrió un error inesperado |
| Error ordinario | INTERNAL_SERVER_ERROR | exception.message |
| Valor no Error/no HttpException | INTERNAL_SERVER_ERROR | Ocurrió un error inesperado |

code no es siempre un identificador fijo en mayúsculas: puede ser el texto error de Nest, por ejemplo Bad Request. El filtro no traduce errores Prisma a 409 ni errores filesystem a 404. No añade stack a la respuesta, pero puede exponer el mensaje de Error o del adaptador Git. No registra logging adicional en este archivo.

Ejemplo ilustrativo:

```json
{"success":false,"data":null,"error":{"code":"Bad Request","message":"Dato inválido"},"meta":null}
```

## Request autenticado

AuthenticatedRequest extiende Request de Express con user id/username. El tipo permite acceder al dato en controladores; no instala un guard ni convierte una ruta pública en protegida. Esa autorización pertenece a Auth y a los decoradores del controlador.

## Swagger

api-response.schemas.ts contiene clases con ApiProperty para ApiError, ApiMeta, envoltura de éxito, usuario, Project, Repository, variables, puertos y Deployment. Incluye ejemplos, nullabilidad y algunos enums. Estas clases describen OpenAPI; no son modelos Prisma ni validadores runtime.

ApiSuccessResponseDoc recibe status, description, dataSchema y extraModels opcional. Usa applyDecorators con ApiExtraModels y ApiResponse. El schema compone con allOf una referencia a la envoltura común y un objeto cuyo campo data tiene el schema proporcionado. El controlador debe pasar referencias/modelos adecuados.

No modifica el status real, la serialización, la autenticación o el dato retornado. Los POST de actualización Project e init documentados como 200 conservan 201 si no llevan HttpCode. Los tipos compartidos de Deployment usan strings mientras Swagger enumera valores; esa diferencia debe mantenerse consciente al cambiar contratos.

Swagger se monta en /docs desde main. No hay endpoint propio del área Shared. Las rutas y parámetros reales se documentan en las notas de cada funcionalidad.

Volver a [[Shared - Indice]].
''', ['src/main.ts', 'src/shared/presentation/interceptors/api-response.interceptor.ts', 'src/shared/presentation/filters/api-exception.filter.ts', 'src/shared/presentation/http/authenticated-request.ts', 'src/shared/presentation/swagger/api-response.schemas.ts', 'src/project/presentation/project.controller.ts', 'src/deployment/presentation/deployment.controller.ts'])

note('Paquete de contratos', '''# Shared · paquete de contratos

## Distribución

`@neoglito/shared` es un workspace privado, ESM, de versión 0.0.0. package.json exporta el índice principal y subrutas api, auth, repository, ports y text. Sus entradas types/import apuntan a archivos TypeScript de src; no se declara un build independiente en este package.json.

tsconfig del paquete usa strict, target ES2023, resolución bundler y noEmit. El build del backend incluye packages/shared/src junto con src en tsconfig.build. El frontend reexporta tipos mediante apps/web/src/shared/api/contracts.ts.

El índice raíz exporta tipos de api/auth/ports/repository y la función runtime normalizeText. Esta función solo aplica trim y lowerCase: no elimina acentos, colapsa espacios internos ni valida el texto. No se encontraron consumidores actuales fuera de su definición/export.

## Contrato HTTP general

```ts
interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: ApiError | null
  meta: ApiMeta | null
}
```

ApiError contiene code:string, message:string y details opcional unknown. ApiMeta tiene page, limit y total opcionales. La interfaz permite combinaciones que el productor normal no utiliza, como success true con error no nulo: no es una unión discriminada que imponga esos invariantes. Interceptor y filtro concretan los valores habituales.

IsoDateString es un alias de string, sin marca ni comprobación runtime de ISO. AuthenticatedUserResponse tiene id:number y username:string.

## Requests y rutas consumidoras

| Contrato | Campos | Uso |
|---|---|---|
| CreateProjectRequest / UpdateProjectRequest | name, description | Registro/edición Project |
| CreateRepositoryRequest | projectId, id, name, gitUrl, cloneUrl | Registro y vínculo Repository |
| CloneRepositoryRequest | cloneUrl | Clonación |
| InitProjectRequest / ProjectComposeFilesRequest | projectId | Inicialización o análisis Compose |
| DeployComposeRequest | projectId, composePath, environment?, ports?, mirrorPorts? | Deployment |
| ReservePortRequest | projectId, port | Reserva provisional |

DeployComposeEnvironmentVariable tiene service opcional, key y value. Sin service se aplica a todos los servicios del archivo en el preparador. ports usa ComposePort, con puertos string y datos sin resolver. mirrorPorts describe configuración del listener y publicación del mismo número; su implementación y limitaciones pertenecen a Deployment.

## Responses y diferencias

| Contrato | Datos principales |
|---|---|
| CreateProjectResponse | Metadatos y fechas ISO |
| ProjectResponse | Lo anterior y repositories `{id,name}` |
| CreateRepositoryResponse | Metadatos y projectId del vínculo solicitado |
| RepositoryResponse | Catálogo GitHub con private, description, language y updatedAt |
| CloneRepositoryResponse | pathSystem |
| InitProjectResponse | clonedRepositoryPaths, dockerComposePaths, análisis de variables |
| ProjectDockerFilesResponse | clonedRepositoryPaths, dockerFilesPath, análisis de variables y puertos |
| DeploymentResponse | Id, proyecto, ruta, status, fechas y services |
| DeploymentPortsResponse | Estado, rutas de origen y services con port nullable |
| PortReservationsResponse | Mapa ownerReservationKey → string de clave de puerto |

dockerComposePaths de init y dockerFilesPath del análisis completo son nombres distintos del contrato, no aliases de JSON. Los análisis de init no incluyen ports. DeploymentServiceResponse tiene port:number, mientras que DeploymentPortsResponse puede usar port:null para servicios sin una asignación activa. No deben sustituirse esos contratos entre sí.

status, health y serviceType de Deployment son strings en el paquete, no enums importados de Prisma. Las categorías reconocidas se documentan en las funcionalidades correspondientes; las interfaces no restringen todos sus valores posibles.

## Duplicaciones de tipos

EnvironmentVariable y ComposePort tienen representaciones estructurales en src/shared/application y packages/shared. El backend no utiliza una sola definición para ambas capas. Mantener cambios requiere revisar esas definiciones, los DTO/respuestas, Swagger y consumidores del frontend.

No todas las interfaces internas de los archivos están reexportadas por el barrel repository: por ejemplo EnvironmentVariable se declara en init-project.response y se usa mediante una subruta. No asumir que cualquier símbolo de un archivo se importa desde la raíz del paquete.

Los tipos no validan JSON, fechas, propiedad de proyectos ni URLs al ejecutar. Las reglas runtime están en casos de uso, preparadores o schemas Zod concretos; véanse [[Project - Implementacion y contratos]] y [[Repository - Implementacion y contratos]].

Volver a [[Shared - Indice]].
''', ['packages/shared/package.json', 'packages/shared/tsconfig.json', 'packages/shared/src/index.ts', 'packages/shared/src/api/api-response.ts', 'packages/shared/src/api/iso-date-string.ts', 'packages/shared/src/repository/index.ts', 'packages/shared/src/repository/responses/init-project.response.ts', 'packages/shared/src/repository/responses/project-docker-files.response.ts', 'packages/shared/src/repository/responses/deployment.response.ts', 'packages/shared/src/repository/responses/deployment-ports.response.ts', 'packages/shared/src/repository/requests/deploy-compose.request.ts', 'packages/shared/src/text/normalize-text.ts', 'tsconfig.build.json'])

note('Cliente HTTP frontend', '''# Shared · cliente HTTP del frontend

## Configuración y transporte

apiClient usa `(VITE_API_URL ?? 'http://localhost:3000').replace(/\\/$/, '')`: elimina un slash final. request(path, options) concatena base y path, llama fetch y luego response.json.

Siempre establece credentials include después de options, de modo que no se sobreescribe mediante el argumento. Añade Accept application/json y combina options.headers por propagación de objeto. No configura Bearer por sí mismo; el flujo normal utiliza la cookie de sesión.

| Método | Implementación |
|---|---|
| get(path) | request con opciones predeterminadas |
| post(path,body) | method POST, Content-Type application/json, JSON.stringify(body) |
| delete(path) | method DELETE |
| request(path,options) | Método general con RequestInit |

No hay helper put/patch, paginación, renovación de sesión, backoff, timeout propio ni tratamiento especial de 401. request admite RequestInit, que puede aportar signal, pero el cliente no crea uno automáticamente.

## Pipeline y errores

```mermaid
flowchart TD
    A[Servicio de feature] --> B[apiClient.request]
    B --> C[fetch con credenciales]
    C --> D[response.json]
    D --> E{Existen success data error meta?}
    E -->|Sí| F[Retornar payload]
    E -->|No| G[INVALID_API_RESPONSE]
    C -->|Rechaza| H[NETWORK_ERROR]
    D -->|Falla parseo| H
```

isApiResponse comprueba un objeto no nulo y presencia de las cuatro propiedades. No verifica tipos, coherencia entre success/data/error ni estructura de T. Un payload con campos mal tipados puede pasar esa comprobación.

No consulta response.ok ni response.status para tomar una decisión. Si un HTTP 400/500 trae la envoltura esperada, la devuelve tal cual para que el consumidor revise success. Un JSON sin envoltura genera INVALID_API_RESPONSE con el payload original en details.

El catch genera NETWORK_ERROR con mensaje de conexión y details del Error si existe. También captura JSON inválido, una respuesta vacía o un abort, de modo que ese code no demuestra que falló la conectividad. El estado HTTP original no se incluye automáticamente en ApiResponse.

## Uso correcto según consumidores actuales

Los servicios funcionales retornan Promise de ApiResponse. Los hooks suelen comprobar success y data; las queryFn lanzan Error para que React Query active isError. No todas las mutaciones genéricas convierten success false en rechazo: el caso concreto debe revisar la respuesta.

```ts
const response = await apiClient.get<ProjectResponse[]>('/project')
if (!response.success || !response.data) {
  throw new Error(response.error?.message ?? 'No fue posible cargar proyectos')
}
return response.data
```

El ejemplo ilustra el patrón actual; requiere importar los tipos y el cliente correspondientes. Los datos dentro de data siguen siendo JSON: la conversión a Date pertenece a los mappers de features.

contracts.ts reexporta contratos del paquete común para el frontend. No genera endpoints ni implementa schemas de validación. La autenticación cookie y CORS se desarrollan en [[Autenticacion - Uso y frontend]].

Volver a [[Shared - Indice]].
''', ['apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/contracts.ts', 'apps/web/src/features/projects/hooks/use-projects.ts', 'apps/web/src/features/repositories/use-repositories.ts', 'src/main.ts'])

note('Estado utilidades y branding', '''# Shared · estado, utilidades y branding

## Contextos de reducer

createReducerContext<State,Action>(name,reducer,initialState) crea dos contextos: uno para estado y otro para dispatch. Usa un Symbol MISSING por fábrica para distinguir ausencia de Provider de un estado legítimamente null.

Provider ejecuta useReducer y publica ambos valores en contextos anidados. useState y useDispatch comparan el valor con MISSING; si falta Provider lanzan un Error con el nombre del contexto. No persiste datos en disco ni localStorage y no reemplaza React Query.

ProjectsProvider, RepositoriesProvider, DeploysProvider y AnalysisProvider consumen la fábrica. Separar dispatch permite leer esa referencia sin leer el estado; no hay selectores de estado por campo dentro de esta utilidad. Cada Provider tiene su propio estado; montar uno nuevo inicia desde initialState.

## Tema

useTheme lee localStorage con clave neoglito-theme. Solo el string dark inicia oscuro; los demás valores inician light. Un efecto escribe el tema actual y toggleTheme alterna light/dark. Retorna theme, isDark y toggleTheme.

No sigue prefers-color-scheme ni eventos storage entre pestañas. Los accesos localStorage no tienen try/catch y dependen del navegador. El hook no cambia clases del DOM por sí mismo: AppLayout aplica data-theme dark/light en su contenedor.

## Fechas

formatDate usa Intl.DateTimeFormat es-MX con día numérico, mes corto y año. formatRelativeTime calcula minutos con Math.round de Date.now menos date:

| Resultado calculado | Texto |
|---|---|
| Menos de 1 minuto | ahora |
| Menos de 60 minutos | hace N min |
| Horas redondeadas menores a 24 | hace N h |
| Días redondeados | hace 1 día o hace N días |

No programa un timer para refrescar etiquetas. Al redondear, la frontera de categorías puede adelantarse respecto al tiempo exacto. Fechas futuras producen minutos negativos y pasan por ahora. No valida Date inválido ni maneja zonas horarias explícitamente en estas funciones.

## Iconos y logo

AppIcon envuelve MorphIcon de morphicons/react con valores predeterminados size 18, strokeWidth 2, absoluteStrokeWidth true y reducedMotion user. Permite propiedades adicionales y sobrescribir esos argumentos mediante props declaradas.

NeoglitoLogo renderiza el estado final con SVG y texto, role img y aria-label Neoglito. Usa currentColor para el trazo y colores de acento según tema. Recibe ref, className y style; AppLayout usa el ref como destino del splash.

## Pipeline del splash

shouldPlayNeoglitoSplash retorna false si matchMedia indica reduced motion o sessionStorage contiene neoglito-splash-played = 1. Si falla sessionStorage retorna true. Depende de window; no define un fallback de ejecución SSR.

useNeoglitoSplash inicia docked como el inverso de esa comprobación. Conserva isDark inicial en un ref; el efecto no actualiza ese ref al cambiar el tema. Si falta target o ya está docked, no ejecuta animación. En caso contrario llama playNeoglitoSplash y al desmontar llama cancel.

```mermaid
flowchart LR
    A[Comprobar sesión y reduced motion] --> B[Crear overlay y logo temporal]
    B --> C[Esperar document.fonts.ready]
    C --> D[Dibujar N y deslizar texto]
    D --> E[Morfología y rebotes]
    E --> F[Medir destino y acomodar logo]
    F --> G[Limpiar y marcar sesión]
```

playNeoglitoSplash inyecta CSS una vez por id ngs-style, agrega overlay y wrapper al body y bloquea overflow del elemento raíz guardando su valor previo. Usa requestAnimationFrame, interpolaciones y easing para dibujar el SVG, desplazar el texto y rebotar el nodo.

Opciones: target, background, ink, accent, bounces opcional (default 3 y mínimo 1), zIndex opcional (default 9999) y onDock opcional. DOCK_AT se calcula con BOUNCE_AT 2950 ms, periodo 1400 ms y parte final de rebote; el acomodo dura 900 ms. Los tiempos son de animación después de fonts.ready, no de carga del backend.

Durante el acomodo vuelve a medir target cada frame para seguir cambios de tamaño. cleanup cancela el frame, elimina overlay/wrapper y restaura overflow; no elimina el CSS inyectado. finish limpia, marca sessionStorage e invoca onDock. cancel solo limpia: no marca sesión ni llama onDock.

AppLayout mantiene invisible el logo definitivo mientras docked es false. Esta secuencia es visual y no espera que Redis, Docker, autenticación o queries estén listos. La preferencia de movimiento se evalúa al decidir reproducir; playNeoglitoSplash no la revalida por sí mismo en cada frame.

Volver a [[Shared - Indice]].
''', ['apps/web/src/shared/state/create-reducer-context.tsx', 'apps/web/src/shared/hooks/use-theme.ts', 'apps/web/src/shared/utils/relative-time.ts', 'apps/web/src/shared/components/app-icon.tsx', 'apps/web/src/shared/branding/neoglito-logo.tsx', 'apps/web/src/shared/branding/neoglito-splash.ts', 'apps/web/src/shared/branding/use-neoglito-splash.ts', 'apps/web/src/app/app-layout.tsx', 'apps/web/src/pages/repository-selection-page.tsx'])

note('Diagnostico pruebas y extension', '''# Shared · diagnóstico, pruebas y extensión

## Diagnóstico

| Síntoma | Explicación del código | Nota relacionada |
|---|---|---|
| No encuentra compose.yaml en análisis | El consumidor activo usa regex docker-compose*.yml | [[Shared - Busqueda de archivos]] |
| Se recorren node_modules o .git | El buscador activo no excluye carpetas | [[Shared - Busqueda de archivos]] |
| Variable compuesta pierde referencias | Solo se captura la primera interpolación con llaves | [[Shared - Extraccion Compose]] |
| Puerto inválido aparece en extracción | Normalizar no equivale a validar/publicar | [[Shared - Extraccion Compose]] |
| TTL fraccionario provoca error | RedisCache exige entero positivo | [[Shared - Redis y cache]] |
| getAll obtiene claves de otra funcionalidad | Caché genérica sin MATCH/namespace | [[Shared - Redis y cache]] |
| Cambiar clave rompe tokens antiguos | No hay rotación ni migración automática | [[Shared - Cifrado y Git]] |
| Error Prisma termina en 500 | El filtro no traduce errores de dominio específicos | [[Shared - HTTP errores y Swagger]] |
| Un objeto con url pierde la envoltura | Heurística estructural del interceptor | [[Shared - HTTP errores y Swagger]] |
| Swagger dice 200 y request responde 201 | El decorador de docs no cambia el status | [[Shared - HTTP errores y Swagger]] |
| NETWORK_ERROR con servidor accesible | El catch también engloba JSON inválido y aborts | [[Shared - Cliente HTTP frontend]] |
| Campo mal tipado pasa el cliente | Solo comprueba presencia de cuatro propiedades | [[Shared - Cliente HTTP frontend]] |
| Hook de estado lanza Provider missing | Consumidor fuera del Provider correspondiente | [[Shared - Estado utilidades y branding]] |
| Etiqueta relativa no cambia sola | No hay timer en formatRelativeTime | [[Shared - Estado utilidades y branding]] |

## Pruebas existentes

RecursiveFileFinderService tiene dos pruebas que crean temporales: búsqueda por ruta relativa y reset de regex stateful. YamlComposeEnviromentVariableExtractService tiene una prueba de mapa/lista, literals, null, default e interpolaciones. No equivalen a validar toda la semántica Docker Compose.

En el área Shared revisada no se encontraron specs dedicados de RedisCache/RedisConnection, cifrado AES, adaptador Git, buscador alternativo, interceptor/filtro, cliente HTTP, fábrica de contextos, tema, fechas o splash. Hay consumidores probados en otros módulos, como ProjectAnalysisService y el preparador Deployment; esa cobertura no sustituye una integración real de Redis, Git o HTTP.

Comandos orientativos para pruebas existentes, **no ejecutados para esta entrega**:

```powershell
npm test -- src/shared/infrastructure/files/recursive-file-finder.service.spec.ts
npm test -- src/shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.spec.ts
```

## Cómo extender según la arquitectura actual

Para una implementación alternativa, mantener el contrato de su puerto y registrar el mismo Symbol en el módulo consumidor. Agregar un archivo bajo shared no basta para que Nest lo pueda inyectar. Elegir useExisting si debe reutilizar una instancia ya registrada, o useClass para el registro de implementación correspondiente.

Al cambiar un contrato HTTP, revisar packages/shared, DTOs y respuestas del backend, Swagger, mappers y servicios frontend. Los tipos duplicados de EnvironmentVariable/ComposePort necesitan revisión conjunta. Mantener nullabilidad y nombres distintos como dockerFilesPath/dockerComposePaths y port number/nullable evita confundir contratos.

Para modificar descubrimiento Compose, cambiar el buscador o patrón que realmente usa ProjectAnalysisService; tocar solo FindDockerFilesUseCase no altera el flujo activo. Para admitir nueva semántica YAML, distinguir extracción de validación/preparación Docker y probar casos que hoy se simplifican.

La documentación describe el comportamiento actual; estas pautas no suponen que se hayan implementado nuevas capacidades o corregido límites.

## Verificación de esta entrega

Se revisaron fuentes y consumidores locales. Se verificaron rutas de fuentes, enlaces Obsidian, bloques Markdown y ejemplos JSON, además de comparar el contenido publicado con el generado. No se modificó código de aplicación ni se ejecutaron pruebas, comandos Git clone, Redis o operaciones Docker.

Volver a [[Shared - Indice]].
''', ['src/shared/infrastructure/files/recursive-file-finder.service.spec.ts', 'src/shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.spec.ts', 'src/analisys/application/project-analysis.service.spec.ts', 'src/deployment/infrastructure/compose/yaml-deployment-compose.service.spec.ts', 'package.json', 'src/analisys/analysis.module.ts', 'packages/shared/src/repository/responses/project-docker-files.response.ts'])

known = set(notes) | {p.stem for p in vault.rglob('*.md')}
for title, (body, sources) in notes.items():
    assert body.count('```') % 2 == 0, title
    for target in re.findall(r'\[\[([^\]|]+)', body):
        assert target in known, (title, target)
    for source in sources:
        assert (repo / source).is_file(), source
    for block in re.findall(r'```json\n(.*?)\n```', body, re.S):
        json.loads(block)
    front = '---\ntags:\n  - neoglito\n  - shared\n  - documentacion-tecnica\nfuncionalidad: Shared\nactualizado: 2026-10-10\n---\n\n'
    footer = '\n## Fuentes del código\n\n' + '\n'.join(f'- [{source}]({(repo / source).as_uri()})' for source in sources) + '\n'
    (out / (title + '.md')).write_text(front + body + footer, encoding='utf-8')
print(f'{len(notes)} notas generadas y verificadas en {out}')
