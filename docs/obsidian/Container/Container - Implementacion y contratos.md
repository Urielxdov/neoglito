---
tags:
  - neoglito
  - container
  - documentacion-tecnica
funcionalidad: container
actualizado: 2026-10-10
---

# Container · implementación y contratos

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

## Fuentes del código

- [src/container/container.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/container.module.ts)
- [src/container/application/container-runtime.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/application/container-runtime.port.ts)
- [src/container/infrastructure/docker/docker-compose-runtime.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/infrastructure/docker/docker-compose-runtime.service.ts)
- [src/app.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/app.module.ts)
- [src/deployment/deployment.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/deployment.module.ts)
- [src/ports/port.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/port.module.ts)
