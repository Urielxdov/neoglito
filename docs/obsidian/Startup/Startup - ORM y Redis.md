---
tags:
  - neoglito
  - startup
  - documentacion-tecnica
funcionalidad: startup
actualizado: 2026-10-10
---

# Startup · ORM y Redis

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

## Fuentes del código

- [prisma/models/deployment.prisma](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/prisma/models/deployment.prisma)
- [src/startup/restore-deployment-port-reservations.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/startup/restore-deployment-port-reservations.service.ts)
- [src/ports/infrastructure/reservations/redis-port-reservation.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/reservations/redis-port-reservation.service.ts)
- [src/prisma/prisma.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/prisma/prisma.service.ts)
