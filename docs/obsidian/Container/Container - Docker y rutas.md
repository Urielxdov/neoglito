---
tags:
  - neoglito
  - container
  - documentacion-tecnica
funcionalidad: container
actualizado: 2026-10-10
---

# Container · Docker y rutas

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

## Fuentes del código

- [src/container/infrastructure/docker/docker-compose-runtime.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/infrastructure/docker/docker-compose-runtime.service.ts)
- [src/container/infrastructure/docker/docker-host-path.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/infrastructure/docker/docker-host-path.ts)
- [src/deployment/application/ports/deployment-compose.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/ports/deployment-compose.port.ts)
- [src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts)
