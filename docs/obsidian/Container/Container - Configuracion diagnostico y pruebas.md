---
tags:
  - neoglito
  - container
  - documentacion-tecnica
funcionalidad: container
actualizado: 2026-10-10
---

# Container · configuración, diagnóstico y pruebas

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

## Fuentes del código

- [docker-compose.yml](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/docker-compose.yml)
- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
- [src/container/infrastructure/docker/assert-docker-is-running.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/infrastructure/docker/assert-docker-is-running.ts)
- [src/container/infrastructure/docker/docker-compose-runtime.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/infrastructure/docker/docker-compose-runtime.service.ts)
- [src/container/infrastructure/docker/docker-compose-runtime.service.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/infrastructure/docker/docker-compose-runtime.service.spec.ts)
- [src/container/infrastructure/docker/docker-host-path.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/infrastructure/docker/docker-host-path.spec.ts)
- [src/ports/infrastructure/classification/container-classification.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/container-classification.service.ts)
- [src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts)
