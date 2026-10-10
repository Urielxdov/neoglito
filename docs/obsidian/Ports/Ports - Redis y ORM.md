---
tags:
  - neoglito
  - ports
  - documentacion-tecnica
funcionalidad: ports
actualizado: 2026-10-10
---

# Ports · Redis y ORM

## Persistencia de reservas

Ports no importa PrismaModule ni define tablas propias. Guarda la coordinación en Redis mediante dos claves relacionadas:

```text
port-reservation:port:5173 → draft:12:port:5173
port-reservation:owner:draft:12:port:5173 → 5173
```

La primera permite un owner por número de puerto. La segunda permite un puerto por owner. El diseño no diferencia hostIp, protocolo ni host de daemon: su espacio de reservas es global por número TCP en esa conexión Redis.

| Owner | Ejemplo | Vida |
| --- | --- | --- |
| Draft | draft:12:port:5173 | 300 s desde POST exitoso |
| Hold de deployment | deployment:UUID:port:5173 | Sin TTL Redis; timer local antes de handoff |
| Contenedor | ID Docker | Sin TTL al crear con restorePort |

La función draftPortOwnerId no incorpora usuario, sesión, campo ni pestaña. Formularios del mismo proyecto y puerto comparten identidad. El servidor no comprueba que ese projectId exista antes de reservar.

## Scripts Lua

RESERVE_SCRIPT y RESTORE_SCRIPT leen portOwner y ownerPort. Si ambos coinciden con el par solicitado, retornan 1 sin reescribir. Si solo existe una clave o hay una diferente, retornan 0. Si ninguna existe, escriben ambas y retornan 1.

RESERVE_SCRIPT aplica EXPIRE a ambas solo cuando recibe TTL. RESTORE_SCRIPT no lo aplica. Un par idéntico conserva cualquier TTL previo: restorePort no convierte automáticamente una reserva ya existente con TTL en permanente.

RELEASE_SCRIPT lee ownerKey, verifica que portKey correspondiente apunte al owner y solo entonces borra las dos. Si falta una o no coincide, retorna 0 sin reparar el estado parcial. Estos scripts son atómicos en Redis, pero no abarcan sockets, Docker o Prisma.

reservePort tiene una comprobación previa que rechaza claves existentes, por lo que su comportamiento público es menos idempotente que el script. restorePort llega directamente al script tras validar y sí acepta un par idéntico.

## getAll

Escanea `port-reservation:owner:*` mediante scanIterator con COUNT 100 y consulta cada lote con mGet. Convierte los valores a Number y conserva enteros 1..65535. Devuelve un mapa **ownerKey → portKey**, no un mapa port → owner ni una lista de puertos libres.

No verifica el par inverso. Una ownerKey válida sin portKey todavía puede aparecer. COUNT es una indicación para SCAN, no paginación HTTP; el endpoint completa la iteración. El resultado puede cambiar durante el recorrido por expiraciones o mutaciones concurrentes y no representa un snapshot transaccional.

## Datos ORM de contenedores

DeploymentService guarda id Docker, composeServiceName, un port Int, status, health, serviceType, lastObservedAt y deploymentId. Los enums y relaciones están en prisma/models/deployment.prisma. Port no es unique. Ports produce datos; el caso de uso de Deployment escribe Prisma.

inspect aporta todos los TCP publicados a la clasificación, pero runtime.list y DeploymentService conservan un puerto por contenedor. Los holds cubren todos los TCP fijos del YAML; después se liberan y solo los observados como ese único port se restauran por containerId. Los demás no quedan representados por ese modelo.

La clasificación guarda resolved.type o UNKNOWN para los demás resultados. También actualiza port/status/health/fecha, sin sincronizar reservas Redis. No persiste evidence, candidates, outcome de sondas, env, aliases ni command. Una respuesta UNKNOWN no permite reconstruir si el resultado interno fue unknown, ambiguous, conflict o resolved UNKNOWN.

## Recuperación al arrancar

Startup consulta servicios con status running/paused/restarting y port > 0 y llama restorePort secuencialmente. Si detecta pares en conflicto acumula IDs y hace fallar el bootstrap. No comprueba el daemon ni elimina reservas sobrantes. Consultar [[Startup - ORM y Redis]].

RedisConnection usa REDIS_URL o redis://localhost:6379, conecta en onModuleInit y quit en onModuleDestroy si está abierto. La persistencia del servidor Redis depende de su configuración; el código del cliente no configura AOF/snapshots.

Las cascadas Prisma no llaman a releasePort ni a Docker. Tampoco existe una transacción distribuida o reconciliación periódica. Los cuatro planos —Redis, sockets del proceso, Docker y filas ORM— pueden divergir después de fallos.

Volver a [[Ports - Indice]].

## Fuentes del código

- [src/ports/infrastructure/reservations/redis-port-reservation.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/reservations/redis-port-reservation.service.ts)
- [src/shared/infrastructure/cache/redis-connection.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/cache/redis-connection.service.ts)
- [prisma/models/deployment.prisma](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/prisma/models/deployment.prisma)
- [src/deployment/application/use-cases/classify-deployment-services.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/classify-deployment-services.use-case.ts)
- [src/startup/restore-deployment-port-reservations.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/startup/restore-deployment-port-reservations.service.ts)
