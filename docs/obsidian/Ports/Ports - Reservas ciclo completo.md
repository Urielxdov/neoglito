---
tags:
  - neoglito
  - ports
  - documentacion-tecnica
funcionalidad: ports
actualizado: 2026-10-10
---

# Ports · reservas: ciclo completo

## Tres operaciones con propósitos diferentes

| Operación | Comprobación TCP | Redis | Socket retenido |
| --- | --- | --- | --- |
| reservePort | Intenta bind y cierra inmediatamente | Par de claves, TTL opcional | No |
| holdPort | Intenta bind y lo mantiene | Par de claves sin TTL | Sí, hasta handoff/release/timeout |
| restorePort | No comprueba disponibilidad | Registra par o acepta par idéntico, sin TTL nuevo | No |

Todas validan port entero 1..65535 y ownerId no vacío. La comprobación TCP usa `createServer().listen({port,host:'0.0.0.0',exclusive:true})` en el entorno de la API. No comprueba UDP, una IP concreta del mapping ni disponibilidad en un daemon remoto.

## Reserva del formulario

POST /port crea owner `draft:<projectId>:port:<port>` y TTL de 300 segundos. reservePort consulta ambas claves. Si cualquiera existe devuelve false, incluso si el par pertenece al mismo owner. Por tanto repetir POST mientras vive la reserva suele devolver 409: no renueva su TTL de forma idempotente.

Si no existen, prueba bind/cierre y ejecuta RESERVE_SCRIPT. La prueba de socket y Redis no son una operación atómica; el script resuelve conflictos Redis aparecidos después de la lectura. Una reserva provisional no mantiene ocupado el socket y no impide que un proceso externo tome el puerto.

## Hold antes de Docker

El preparador de Deployment reúne los TCP fijos del YAML final. Para cada uno el coordinador libera el draft y llama holdPort con owner `deployment:<deploymentId>:port:<port>`. Hold abre el socket primero, luego evalúa RESERVE_SCRIPT sin TTL.

Un rechazo del script cierra el socket y devuelve null. Un éxito agrega HeldPort a un Map del proceso con socket, timer y handedOff false. El timeout predeterminado es 30 000 ms: intenta releaseHeldPort y registra aviso. Es un temporizador Node, no una expiración Redis.

Si la evaluación Redis lanza una excepción después de abrir el socket, ese camino no tiene un finally que lo cierre. Un cierre abrupto del proceso elimina sus sockets pero no las reservas sin TTL. No hay un recolector periódico de owners de holds abandonados.

## Handoff

handoffHeldPort cancela el timer, marca handedOff true y cierra el socket. Conserva Redis. Si ya se hizo handoff o no encuentra el hold, retorna sin error; no prueba nuevamente que el par Redis siga presente.

La variante handoff(operation) ejecuta la operación después del cierre; si la operación falla intenta releasePort y vuelve a lanzar. DeployComposeUseCase usa **handoff() sin callback**, en paralelo para todos los holds, y después runtime.up. Su propio catch coordina la compensación.

```mermaid
sequenceDiagram
    participant U as Deployment
    participant R as Reserva
    participant S as Socket API
    participant K as Redis
    participant D as Docker
    U->>R: holdPort(N, owner temporal)
    R->>S: bind 0.0.0.0:N
    R->>K: Registrar par sin TTL
    U->>R: handoff()
    R->>S: close
    Note over K,D: Redis conserva owner; Docker aún no publica
    U->>D: up
    U->>D: list
    U->>R: releasePort(owner temporal)
    R->>K: Borrar par temporal
    U->>R: restorePort(N, containerId)
    R->>K: Registrar par del contenedor
```

Entre cerrar el socket e iniciar Docker existe una ventana en que otro proceso puede ocuparlo. Redis coordina clientes de Neoglito, no el sistema operativo completo.

## Transferencia y liberación

Después de list se liberan los owners temporales y se restaura el puerto observado por cada contenedor con port > 0. No es una sustitución atómica de owner: hay un intervalo sin reserva. restorePort funciona mientras Docker ocupa el puerto porque omite bind.

releasePort retira el hold local, cancela el timer y cierra el socket si no fue entregado. Luego el script borra ambas claves solo si el ownerKey existe y portKey confirma el mismo owner. Devuelve false si no hay par liberable. `held.release()` usa la misma limpieza.

Stop libera usando IDs persistidos de contenedores. DELETE /port solo construye owners draft y no libera los de contenedores. Ver [[Ports - Redis y ORM]] para claves, idempotencia y estados incompletos.

Volver a [[Ports - Indice]].

## Fuentes del código

- [src/ports/infrastructure/reservations/redis-port-reservation.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/reservations/redis-port-reservation.service.ts)
- [src/ports/application/draft-port-owner.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/application/draft-port-owner.ts)
- [src/deployment/application/use-cases/deploy-compose.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/deploy-compose.use-case.ts)
