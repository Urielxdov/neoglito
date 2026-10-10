---
tags:
  - neoglito
  - container
  - documentacion-tecnica
funcionalidad: container
actualizado: 2026-10-10
---

# Container · endpoints y uso

No existe un controlador `/container` en este módulo. Las operaciones públicas se coordinan desde `DeploymentController`, protegido por `JwtAuthGuard`. La sesión se obtiene de cookie access_token o Bearer JWT; no se envía userId en el body.

## Rutas relacionadas

| Método y ruta | Parámetros | Relación con container | Éxito esperado |
| --- | --- | --- | --- |
| POST `/deployment` | JSON de despliegue | Prepara Compose, llama up/list y persiste | 201 |
| POST `/deployment/:deploymentId/stop` | ID en ruta; sin body utilizado | Llama down y actualiza ORM/reservas | 201 |
| POST `/deployment/:deploymentId/classify` | ID en ruta; sin body utilizado | Llama list/inspect y clasificador | 201 |
| GET `/deployment/project/:projectId` | ID numérico en ruta | Devuelve filas persistidas con servicios | 200 |
| GET `/deployment/:deploymentId/ports` | ID en ruta | Consulta puertos guardados y metadatos Compose | 200 |

Son estados esperados por los decoradores actuales, no respuestas verificadas en vivo. Stop declara 200 en Swagger pero no usa `@HttpCode`, por lo que mantiene el 201 por defecto de POST. `projectId` de GET utiliza ParseIntPipe. Los deploymentId no usan ParseUUIDPipe, aunque Swagger los describa como UUID.

## Parámetros del despliegue

| Campo JSON | Tipo esperado | Obligatorio | Uso |
| --- | --- | --- | --- |
| `projectId` | number | Sí | Proyecto que contiene el Compose |
| `composePath` | string | Sí | Ruta de un Compose descubierto para el proyecto |
| `environment` | array | No | Variables a aplicar al YAML preparado |
| `ports` | array | No | Configuración de puertos por servicio |
| `mirrorPorts` | boolean | No | Solicitar adaptación del puerto interno y publicado |

Cada elemento environment usa `key: string`, `value: string` y `service?: string`. Si se omite service, el preparador aplica la variable a todos los servicios. Cada elemento ports usa `service`, `hostIp`, `publishedPort`, `targetPort`, `protocol` y `mappingType`, según el contrato compartido ComposePort.

Los DTO contienen metadatos Swagger, sin validadores; main.ts no registra ValidationPipe. El preparador y casos de uso realizan comprobaciones concretas, pero no debe asumirse validación automática completa del JSON.

Ejemplo mínimo, usando una ruta ya descubierta por la API:

```http
POST /deployment
Authorization: Bearer <JWT>
Content-Type: application/json

{"projectId": 12, "composePath": "/app/repo/usuario/api/docker-compose.yml"}
```

Las rutas son del backend, no del equipo que hace la petición. La solicitud inicia un despliegue; no es una consulta de previsualización. Las modificaciones de YAML y las reservas son responsabilidad de deployment/ports.

## Respuestas

Las respuestas se envuelven con `{ success, data, error, meta }`. La respuesta de desplegar, detener o clasificar contiene un DeploymentResponse con IDs, ruta Compose, estado, fechas ISO y `services`:

```json
{
  "id": "container-id-ilustrativo",
  "composeServiceName": "api",
  "port": 8080,
  "status": "running",
  "health": "none",
  "serviceType": "UNKNOWN",
  "lastObservedAt": "2026-10-10T06:00:00.000Z",
  "deploymentId": "deployment-id-ilustrativo"
}
```

Este bloque es un elemento ilustrativo de services, no la respuesta completa. El contrato público no devuelve env, command ni aliases de inspect.

GET de puertos devuelve deploymentId, projectId, status, sourceComposePath, projectDirectory y servicios con containerId, composeServiceName y port. Solo considera activos los despliegues building/starting/running; fuera de ellos devuelve port null y metadatos null. También devuelve null si el puerto guardado es 0. No consulta puertos en vivo con el runtime.

## Errores

401 indica problemas con la sesión. Los casos de uso responden 404 ante proyecto/despliegue inexistente. El despliegue puede rechazar con 400 un Compose ajeno al proyecto o configuración inválida. Clasificar produce 409 cuando faltan contenedores, alguno no está running o falla su observación/inspección.

Los errores genéricos del runtime se transforman a 500 por el filtro global salvo que un consumidor los convierta a otra HttpException. El estado depende del punto donde ocurra el fallo; no todo error Docker produce el mismo código.

## Consumo interno

```typescript
// Proveedor Nest que ya inyectó CONTAINER_RUNTIME_PORT:
const observed = await this.runtime.list(directory, composePath, projectName);
const details = await this.runtime.inspect(observed.map(x => x.containerId));
```

Las llamadas up/down/delete no escriben ORM automáticamente. Un consumidor que las use directamente debe coordinar el estado que necesite guardar. No hay endpoints públicos para inspect, readFile, listFiles o delete en el módulo revisado.

## Fuentes del código

- [src/deployment/presentation/deployment.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/presentation/deployment.controller.ts)
- [src/deployment/application/dto/deploy-compose.dto.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/dto/deploy-compose.dto.ts)
- [src/deployment/application/responses/deployment.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/responses/deployment.response.ts)
- [src/deployment/application/use-cases/get-deployment-ports.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/get-deployment-ports.use-case.ts)
- [src/deployment/application/use-cases/classify-deployment-services.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/classify-deployment-services.use-case.ts)
- [src/container/application/container-runtime.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/application/container-runtime.port.ts)
- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
- [src/shared/presentation/interceptors/api-response.interceptor.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/interceptors/api-response.interceptor.ts)
- [src/shared/presentation/filters/api-exception.filter.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/filters/api-exception.filter.ts)
