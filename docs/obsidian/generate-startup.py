from pathlib import Path
import re

base = Path(__file__).resolve().parent
repo = base.parent.parent
out = base / 'Startup'
out.mkdir(exist_ok=True)

notes = {
'Startup - Indice': ('''# Startup · documentación técnica

`src/startup` contiene la recuperación automática de reservas de puertos al iniciar el backend. Su objetivo es reconstruir en Redis la relación puerto–propietario registrada en PostgreSQL, antes de aceptar peticiones HTTP. Esta documentación incluye el arranque general que ejecuta esa recuperación.

Inferido del código revisado el **10 de octubre de 2026**. Los ejemplos ilustran contratos y estados; no proceden de una ejecución contra Docker, PostgreSQL o Redis activos.

## Recorrido de lectura

1. [[Startup - Flujo]]: orden del arranque y condiciones para escuchar HTTP.
2. [[Startup - Implementacion y contratos]]: servicio, inyección, hooks y parámetros internos.
3. [[Startup - ORM y Redis]]: consulta Prisma, modelo y restauración atómica.
4. [[Startup - Uso configuracion y diagnostico]]: ejecución, variables, rutas relacionadas y fallos.

## Alcance

La recuperación se ejecuta una vez por inicialización de la aplicación Nest. No es un endpoint, una tarea periódica ni un proceso que arranque contenedores de proyectos. Reiniciar el proceso del backend vuelve a ejecutarla.

El servicio usa el estado persistido de `DeploymentService`; no consulta Docker para confirmar cada contenedor. La comprobación inicial de Docker verifica la disponibilidad de su daemon, que es una responsabilidad distinta.
''', ['src/startup/restore-deployment-port-reservations.service.ts', 'src/main.ts', 'src/app.module.ts']),
'Startup - Flujo': ('''# Startup · flujo

## Orden del arranque

```mermaid
flowchart TD
    A[Ejecutar src/main.ts] --> B{Existe .env en el directorio actual?}
    B -->|Sí| C[Cargar variables con loadEnvFile]
    B -->|No| D[Usar entorno del proceso]
    C --> E[Comprobar daemon con docker info]
    D --> E
    E -->|Disponible| F[Importar AppModule y crear aplicación Nest]
    E -->|Error| X[Arranque interrumpido]
    F --> G[Configurar filtro, interceptor, CORS y Swagger]
    G --> H[app.listen inicia la inicialización de Nest]
    H --> I[Hooks onModuleInit: conexión Prisma y Redis]
    I --> J[onApplicationBootstrap: restaurar reservas]
    J -->|Éxito| K[Escuchar HTTP en PORT o 3000]
    J -->|Conflicto o excepción| X
```

`AppModule` se importa dinámicamente después de cargar `.env` y comprobar Docker. Esto permite que los módulos importados lean las variables durante su evaluación. No hay `ConfigModule` en este flujo.

La conexión Prisma y la conexión Redis ocurren en sus respectivos `onModuleInit`. El código no establece un orden relativo entre ambas; la recuperación sucede después de los hooks de inicialización. Se verificó en la implementación local de Nest que `listen()` llama a `init()` cuando hace falta, y que `init()` espera `callInitHook()` y después `callBootstrapHook()` antes de escuchar HTTP.

## Recuperación de reservas

```mermaid
sequenceDiagram
    participant N as Ciclo de vida Nest
    participant S as RestoreDeploymentPortReservationsService
    participant P as Prisma / PostgreSQL
    participant R as PortReservationPort / Redis
    N->>S: onApplicationBootstrap()
    S->>P: findMany(status activo y port mayor que 0)
    P-->>S: Lista de id y port
    loop Servicios seleccionados, en secuencia
        S->>R: restorePort(port, id)
        R-->>S: true o false
        S->>S: Acumular conflicto si false
    end
    alt Hay conflictos
        S-->>N: Error con IDs y puertos
    else Sin conflictos
        S->>S: Registrar cantidad seleccionada
        S-->>N: Promise resuelta
    end
```

Un `false` no corta el bucle: se intentan los demás servicios y al final se lanza un error con todos los conflictos encontrados. Una excepción de Prisma o Redis sí interrumpe inmediatamente la ejecución. No existe rollback de reservas ya restauradas.

Si la consulta no devuelve servicios, el arranque continúa y el log indica cero. El mensaje de éxito cuenta filas seleccionadas, incluidas reservas que ya estaban correctas; no mide nuevas claves creadas.

Consulta las reglas exactas en [[Startup - ORM y Redis]] y los errores en [[Startup - Uso configuracion y diagnostico]].
''', ['src/main.ts', 'src/prisma/prisma.service.ts', 'src/shared/infrastructure/cache/redis-connection.service.ts', 'src/startup/restore-deployment-port-reservations.service.ts', 'node_modules/@nestjs/core/nest-application.js']),
'Startup - Implementacion y contratos': ('''# Startup · implementación y contratos

## Registro y dependencias

No existe un `StartupModule`: `AppModule` registra directamente `RestoreDeploymentPortReservationsService` en `providers` e importa `PrismaModule` y `PortModule`.

```mermaid
flowchart LR
    A[AppModule] --> S[RestoreDeploymentPortReservationsService]
    S --> P[PrismaService]
    S --> T[PORT_RESERVATION_PORT]
    T --> R[RedisPortReservationService]
    R --> C[RedisConnection]
    C --> D[(Redis)]
    P --> B[(PostgreSQL)]
```

`PortModule` vincula el símbolo `PORT_RESERVATION_PORT` mediante `useExisting: RedisPortReservationService` y lo exporta. El servicio startup depende de la interfaz `PortReservationPort` e inyecta el símbolo en tiempo de ejecución. `CacheModule` proporciona y exporta `RedisConnection` para el adaptador.

## Contratos utilizados

| Función | Parámetros | Retorno | Responsabilidad |
| --- | --- | --- | --- |
| `bootstrap()` | Ninguno | `Promise<void>` | Configurar e iniciar backend; función interna de main |
| `assertDockerIsRunning()` | Ninguno | `void` o excepción | Comprobar CLI y daemon Docker |
| `onApplicationBootstrap()` | Ninguno | `Promise<void>` | Leer servicios y restaurar sus reservas |
| `restorePort(port, ownerId)` | `port: number`, `ownerId: string` | `Promise<boolean>` | Recuperar la asociación en Redis |

En startup, `ownerId` siempre es `DeploymentService.id`. No se usa `projectId`, `deploymentId` ni el identificador de una reserva temporal. `restorePort` no recibe TTL ni credenciales del usuario.

## Comprobación de Docker

Se prueban estos candidatos en orden: `DOCKER_PATH` si tiene valor, `docker`, `docker.exe` y `C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe`. Los candidatos distintos de los nombres simples se omiten si no existen como ruta.

Cada intento usa `spawnSync` con argumentos `['info', '--format', '{{.ServerVersion}}']`, salida UTF-8 y timeout de 10 segundos. Código de salida cero permite continuar. `ENOENT` prueba el siguiente candidato; otro error de ejecución lanza excepción. Un comando existente que sale con código distinto de cero detiene la búsqueda y produce el diagnóstico de daemon no disponible.

La comprobación es síncrona y ocurre antes de crear Nest. El timeout es por intento, no una garantía de duración total del arranque. No inicia Docker Desktop, no valida Compose y no comprueba los contenedores registrados en PostgreSQL.

## Configuración HTTP global

`main.ts` registra `ApiExceptionFilter`, `ApiResponseInterceptor`, CORS con `credentials: true` y origen `FRONTEND_URL` o `http://localhost:5174`. Swagger se monta en `/docs`, título `Neoglito API`, versión `1.0`, con definición Bearer.

Los errores anteriores a la escucha HTTP son errores de arranque; el filtro HTTP no los convierte en respuestas JSON para un cliente. El punto de entrada usa `await bootstrap()` sin recuperación personalizada.

El cierre de Redis está implementado en `onModuleDestroy` con `quit()` si el cliente está abierto. `main.ts` no llama a `enableShutdownHooks()`, por lo que no debe asumirse a partir de este código que ese hook se ejecutará ante cualquier señal del sistema.

Para la consulta y efectos sobre los datos, continúa en [[Startup - ORM y Redis]].
''', ['src/app.module.ts', 'src/startup/restore-deployment-port-reservations.service.ts', 'src/ports/port.module.ts', 'src/ports/application/port-reservation.port.ts', 'src/shared/infrastructure/cache/cache.module.ts', 'src/container/infrastructure/docker/assert-docker-is-running.ts', 'src/main.ts', 'src/shared/infrastructure/cache/redis-connection.service.ts']),
'Startup - ORM y Redis': ('''# Startup · ORM y Redis

## Lectura Prisma

Startup accede directamente a `PrismaService`; no hay un repositorio específico ni escrituras al ORM en esta funcionalidad.

```typescript
const services = await this.prisma.deploymentService.findMany({
  where: {
    status: { in: ['running', 'paused', 'restarting'] },
    port: { gt: 0 },
  },
  select: { id: true, port: true },
});
```

| Campo / criterio | Uso |
| --- | --- |
| `DeploymentService.id: String @id` | Propietario de la reserva; no tiene generación automática en el modelo |
| `port: Int` | Puerto que se restaura si es mayor que cero |
| `status: ContainerStatus` | Incluye running, paused y restarting |
| `deploymentId: String` | Relación requerida con Deployment; no se consulta en startup |
| `health`, `lastObservedAt`, `serviceType` | No se seleccionan ni validan aquí |

El modelo también define `composeServiceName` y una relación `Deployment` con borrado en cascada. Tiene índices sobre `deploymentId` y `status`; no tiene una restricción única sobre `port`. Dos filas con el mismo puerto pueden existir en PostgreSQL y entrar en conflicto al restaurarse en Redis.

No se incluyen `created`, `exited` ni `dead`; tampoco puertos cero o negativos. La consulta no comprueba `Deployment.status`, salud, fecha de última observación ni pertenencia a usuario/proyecto. No hay `orderBy` ni paginación.

El filtro SQL permite un valor superior a 65535 si estuviera persistido; el adaptador lo rechaza y startup lo reporta como conflicto. No hay un CHECK de rango expresado en este modelo Prisma.

## Representación Redis

Para `id = container-123` y `port = 8080`, se utilizan dos claves de tipo string:

```text
port-reservation:port:8080           -> container-123
port-reservation:owner:container-123 -> 8080
```

`restorePort` valida primero entero entre 1 y 65535 y propietario no vacío. Después ejecuta `RESTORE_SCRIPT` mediante `eval`, con ambas claves y argumentos `[ownerId, String(port)]`.

| Estado previo | Resultado | Efecto |
| --- | --- | --- |
| Ambas claves ausentes | true | Crea las dos asociaciones |
| Ambas claves coinciden con propietario y puerto | true | Conserva la asociación existente |
| Alguna clave existe y no se cumple la coincidencia completa | false | Conserva las claves existentes |
| Puerto inválido o propietario vacío | false | No ejecuta Lua |
| Error de conexión o ejecución Redis | Excepción | Interrumpe startup |

La verificación y escritura son atómicas para una pareja de claves mediante Lua; el conjunto de todos los servicios no es una transacción. Si ocurre un conflicto posterior, las reservas anteriores permanecen.

## Restauración frente a reserva nueva

`restorePort` no abre sockets ni comprueba disponibilidad TCP. Esto permite representar puertos ya utilizados por los contenedores. `reservePort` sí verifica disponibilidad y es una operación distinta.

Al crear claves, `RESTORE_SCRIPT` no aplica TTL. Cuando ambas claves ya coinciden, retorna sin reescribirlas: si tenían TTL, lo conservan. No debe describirse la operación como eliminación universal de expiraciones.

La recuperación no limpia reservas sobrantes, no repara parejas incompletas, no actualiza estados en PostgreSQL ni reconcilia Docker. Si PostgreSQL conserva un estado antiguo, también puede restaurarse una reserva antigua. Si dos servicios seleccionados compiten por un puerto y Redis empieza vacío, uno puede reservarlo y otro fallar; sin orden explícito no hay un ganador garantizado por la consulta.

Consulta [[Startup - Flujo]] para el efecto de esos resultados sobre el arranque.
''', ['prisma/models/deployment.prisma', 'src/startup/restore-deployment-port-reservations.service.ts', 'src/ports/infrastructure/reservations/redis-port-reservation.service.ts', 'src/prisma/prisma.service.ts']),
'Startup - Uso configuracion y diagnostico': ('''# Startup · uso, configuración y diagnóstico

## Cómo se ejecuta

Startup es automático al iniciar el backend. Desde la raíz del proyecto, `npm run start:dev` usa `nest start --watch`; `npm start` usa `nest start`. En producción, el script declarado `npm run start:prod` usa `node dist/src/main` y requiere compilación previa. No se verificó el arranque de esos comandos en esta tarea documental.

En `docker-compose.yml`, la API espera los healthchecks de PostgreSQL y Redis. Su comando ejecuta, en orden, `npm ci --include=dev`, `npx prisma generate`, `npx prisma db push` y `npm run start:dev`. Esa preparación ocurre antes de `main.ts`: el bootstrap por sí solo no genera Prisma ni aplica esquemas o migraciones.

El socket `/var/run/docker.sock` se monta dentro de la API para acceder al daemon del host. PostgreSQL tiene volumen `postgres_data`; Redis no tiene un volumen persistente declarado en este Compose. La recuperación permite reconstruir las asociaciones faltantes a partir de las filas seleccionadas de PostgreSQL.

## Variables relevantes

| Variable | Lectura / valor por defecto | Efecto |
| --- | --- | --- |
| `DATABASE_URL` | Obligatoria en PrismaService | Conexión PostgreSQL; falta impide crear el servicio |
| `REDIS_URL` | RedisConnection: `redis://localhost:6379` | Conexión Redis; Compose usa por defecto `redis://redis:6379` |
| `DOCKER_PATH` | Opcional | Primer candidato para ejecutar docker info; ruta completa recomendada |
| `PORT` | main: `3000` mediante `??` | Puerto de escucha HTTP |
| `FRONTEND_URL` | main: `http://localhost:5174` mediante `??` | Origen permitido por CORS |
| `JWT_SECRET` | Obligatoria en JwtStrategy | AuthModule forma parte del arranque aunque no se use login |
| `ENCRYPTION_SECRET_KEY` | Obligatoria; base64 de 32 bytes | Construcción del cifrador registrado en AuthModule |

`.env` se busca respecto al directorio de trabajo del proceso; si existe se usa `loadEnvFile()`. Las variables ya presentes en el entorno del proceso tienen prioridad. Los fallbacks con `??` no reemplazan una cadena vacía.

La configuración OAuth y sus variables están descritas en las notas de autenticación. Startup no recibe parámetros HTTP, usuario autenticado ni un número de puerto específico solicitado por un cliente.

## Endpoints relacionados

No existe `/startup` ni un endpoint para disparar la recuperación. Se relaciona con estas rutas para inspección después del arranque:

| Método / ruta | Parámetros | Autenticación | Utilidad |
| --- | --- | --- | --- |
| `GET /` | Ninguno leído por el handler | Sin guard | AppController devuelve Hello World! mediante el interceptor global |
| `GET /port` | Ninguno leído por el handler | Sin guard | Lista asociaciones actuales de reservas en Redis |
| `/docs` | Interfaz Swagger | Sin guard configurado en main | Consultar documentación HTTP generada |

Ejemplo ilustrativo de `GET /port` con una reserva restaurada:

```json
{
  "success": true,
  "data": {
    "port-reservation:owner:container-123": "port-reservation:port:8080"
  },
  "error": null,
  "meta": null
}
```

`GET /port` puede mostrar otras reservas existentes además de las restauradas. `GET /` no es un healthcheck dedicado de PostgreSQL, Redis o Docker: sólo responde a través de la aplicación que terminó su inicialización. No hay un endpoint específico de readiness en los archivos revisados.

## Fallos y diagnóstico

| Síntoma / mensaje | Origen y comprobación |
| --- | --- |
| Docker no está instalado o no está disponible para Node | Candidatos CLI no encontrados; revisar PATH o DOCKER_PATH en el entorno del proceso |
| Docker está instalado, pero el daemon no está disponible | docker info terminó sin éxito; revisar Docker Desktop/servicio y socket/contexto |
| No se pudo verificar Docker | Error de ejecución distinto de ENOENT, incluido timeout |
| DATABASE_URL is required to initialize Prisma | Configuración faltante al construir PrismaService |
| Error de Prisma durante conexión o findMany | Revisar accesibilidad de PostgreSQL, credenciales y esquema existente |
| Redis client error | Evento registrado por RedisConnection; comprobar REDIS_URL y conectividad |
| No se pudieron restaurar las reservas de puertos: … | Una o más llamadas devolvieron false; revisar parejas de claves, duplicados y rango |
| API no escucha pese a reservas parcialmente creadas | Un hook falló después de otras restauraciones; no hay rollback global |

El conflicto usa el formato `${service.id} (puerto ${service.port})` y concatena todos los encontrados. El log de éxito es `Reservas de puertos restauradas para N contenedor(es) activo(s)`; «activos» se refiere a los estados persistidos seleccionados.

## Comprobación manual sugerida

1. Revisar Docker, PostgreSQL, Redis y variables del proceso antes de iniciar la API.
2. Identificar en PostgreSQL servicios running/paused/restarting con puerto mayor que cero.
3. Iniciar backend y contrastar el log con esas filas.
4. Consultar GET /port o inspeccionar ambas claves Redis para confirmar las asociaciones.
5. En un entorno de pruebas, reiniciar backend conservando claves: las parejas correctas deben aceptarse de nuevo.
6. Para investigar un fallo, contrastar cada ID/puerto reportado con ambas claves. Determinar quién mantiene realmente la reserva antes de corregir datos.

Estas comprobaciones no se ejecutaron durante la documentación. No se encontraron pruebas específicas del servicio startup en `src` o `test`; existen pruebas de despliegue que simulan llamadas a `restorePort`, lo que no verifica este hook ni el script Redis real.

Las reglas de selección y los casos Redis se detallan en [[Startup - ORM y Redis]].
''', ['package.json', 'docker-compose.yml', 'src/main.ts', 'src/app.controller.ts', 'src/app.service.ts', 'src/ports/presentation/port.controller.ts', 'src/shared/presentation/interceptors/api-response.interceptor.ts', 'src/shared/infrastructure/cache/redis-connection.service.ts', 'src/prisma/prisma.service.ts', 'src/auth/infrastructure/passport/jwt.strategy.ts', 'src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts', 'src/startup/restore-deployment-port-reservations.service.ts', 'src/deployment/application/use-cases/deploy-compose.use-case.spec.ts']),
}

for title, (body, sources) in notes.items():
    for link in re.findall(r'\[\[([^\]]+)\]\]', body):
        assert link in notes, (title, link)
    footer = '\n## Fuentes del código\n\n'
    for source in sources:
        file = repo / source
        assert file.is_file(), source
        footer += f'- [{source}]({file.as_uri()})\n'
    metadata = '---\ntags:\n  - neoglito\n  - startup\n  - documentacion-tecnica\nfuncionalidad: startup\nactualizado: 2026-10-10\n---\n\n'
    (out / f'{title}.md').write_text(metadata + body.strip() + '\n' + footer, encoding='utf-8')
print(f'{len(notes)} notas de startup; referencias internas y fuentes verificadas.')
