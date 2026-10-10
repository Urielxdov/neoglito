---
tags:
  - neoglito
  - ports
  - documentacion-tecnica
funcionalidad: ports
actualizado: 2026-10-10
---

# Ports · endpoints

## Rutas de reserva

| Método y ruta | Autenticación | Parámetros | Éxito esperado |
| --- | --- | --- | --- |
| GET /port | Sin JwtAuthGuard | Ninguno | 200 con mapa de reservas |
| POST /port | JwtAuthGuard, cookie o Bearer | Body projectId number, port number | 201 con port y ownerId |
| DELETE /port/:projectId/:port | JwtAuthGuard | Ambos con ParseIntPipe | 200 con released boolean |

PortController no tiene guard de clase; solo POST/DELETE lo declaran. main/AppModule tampoco registran un guard global en el código revisado. GET es público y lista owners de todo ese espacio Redis, no solo de un usuario.

El DTO de POST solo aporta Swagger. La validación ejecutada exige port entero 1..65535 y projectId entero. No exige projectId positivo, no busca el proyecto en Prisma ni verifica propiedad. No acepta port como string JSON y no acepta rangos; para ello retorna 400.

DELETE valida el rango de port tras convertir ambos parámetros. projectId usa ParseIntPipe; no agrega comprobación de existencia/propiedad. Solo construye owner draft. Repetir la liberación puede devolver released false con 200.

## Reservar

```http
POST /port
Authorization: Bearer <JWT>
Content-Type: application/json

{"projectId":12,"port":5173}
```

```json
{
  "success": true,
  "data": {"port":5173,"ownerId":"draft:12:port:5173"},
  "error": null,
  "meta": null
}
```

La reserva vence en 300 segundos. No reserva un deployment ni abre un contenedor. POST no permite indicar ownerId o TTL: el controlador los determina. El puerto puede estar ocupado por un proceso externo aunque no aparezca en GET; reservePort prueba bind y puede responder 409.

## Listar y liberar

GET /port devuelve, dentro de data:

```json
{
  "port-reservation:owner:draft:12:port:5173": "port-reservation:port:5173",
  "port-reservation:owner:id-docker-ilustrativo": "port-reservation:port:8080"
}
```

Un mapa vacío significa que getAll no encontró owners válidos; no significa que todos los puertos del SO estén libres. El nombre interno availablePorts no cambia ese contrato.

DELETE /port/12/5173 devuelve data {released:true} si pudo borrar el par draft y false si no pudo liberarlo. No modifica recursos Docker ni filas DeploymentService. El esquema de error global es `{success:false,data:null,error:{code,message},meta:null}`.

## Errores de reservas

| HTTP | Causa |
| --- | --- |
| 400 | Port no válido, projectId no entero o parámetros no parseables |
| 401 | POST/DELETE con sesión ausente, inválida o expirada |
| 409 | reservePort devuelve false por conflicto o indisponibilidad TCP |
| 500 | Excepción no convertida de Redis/socket u otra infraestructura |

No se distingue por HTTP 409 si el conflicto es de owner Redis o del socket TCP. Consultar logs de reserva para el detalle disponible.

## Clasificar servicios

POST /deployment/:deploymentId/classify pertenece al controlador de Deployment. Requiere JWT, usa ID string sin ParseUUIDPipe y no consume body. Retorna 201 con DeploymentResponse actualizado. La precondición exige servicios persistidos presentes y running, con o sin publicaciones.

404: deployment no existe. 409: sin servicios, falta un contenedor, no está running, falla list/inspect o faltan inspecciones/resultados. Un Classification.kind conflict no es ese 409: se guarda UNKNOWN y puede responder éxito. El detalle de candidatos/evidence no se expone por HTTP.

## Consultar asignaciones

GET /deployment/:deploymentId/ports requiere JWT y devuelve puertos ORM/metadatos de Compose, no reservas Redis ni sondas. Solo estados building/starting/running se consideran activos; fuera de ellos port null. Ver [[Deployment - Endpoints]].

No existen endpoints de probe(host,ports), hold, handoff, restore, consulta de evidencia completa ni liberación arbitraria por containerId. Esos contratos son internos.

Volver a [[Ports - Indice]].

## Fuentes del código

- [src/ports/presentation/port.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/presentation/port.controller.ts)
- [src/ports/application/dto/reserve-port.dto.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/application/dto/reserve-port.dto.ts)
- [src/ports/application/draft-port-owner.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/application/draft-port-owner.ts)
- [packages/shared/src/ports/requests/reserve-port.request.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/ports/requests/reserve-port.request.ts)
- [packages/shared/src/ports/responses/port-reservations.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/ports/responses/port-reservations.response.ts)
- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
- [src/deployment/presentation/deployment.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/presentation/deployment.controller.ts)
- [src/deployment/application/use-cases/get-deployment-ports.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/get-deployment-ports.use-case.ts)
