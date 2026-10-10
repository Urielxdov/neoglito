---
tags:
  - neoglito
  - container
  - documentacion-tecnica
funcionalidad: container
actualizado: 2026-10-10
---

# Container · ORM y estados

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

## Fuentes del código

- [src/container/domain/entities/container.entity.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/domain/entities/container.entity.ts)
- [prisma/models/deployment.prisma](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/prisma/models/deployment.prisma)
- [src/deployment/application/use-cases/deploy-compose.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/deploy-compose.use-case.ts)
- [src/deployment/application/use-cases/classify-deployment-services.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/classify-deployment-services.use-case.ts)
- [src/deployment/application/use-cases/get-deployment-ports.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/get-deployment-ports.use-case.ts)
- [src/startup/restore-deployment-port-reservations.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/startup/restore-deployment-port-reservations.service.ts)
