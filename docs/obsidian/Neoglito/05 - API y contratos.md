---
tags:
  - neoglito
  - documentacion
actualizado: 2026-10-10
tipo: documentacion-tecnica
---

# API y contratos

Swagger está disponible en `http://localhost:3000/docs` cuando la API arranca. La tabla refleja los decoradores del código, incluidos los endpoints que actualmente no tienen `JwtAuthGuard`.

| Método | Ruta | JWT | Función |
| --- | --- | --- | --- |
| GET | `/auth/github` | No | Inicia OAuth |
| GET | `/auth/github/callback` | No | Procesa code y crea sesión |
| GET | `/auth/me` | Sí | Usuario autenticado |
| GET | `/repository/all` | Sí | Repositorios GitHub del usuario |
| POST | `/repository/registry` | No | Vincula repositorio y proyecto |
| POST | `/repository/clone` | Sí | Clona o reutiliza carpeta |
| GET | `/project` | Sí | Lista proyectos |
| POST | `/project/registry` | No | Crea proyecto |
| POST | `/project/:id/update` | Sí | Edita nombre y descripción |
| POST | `/project/init` | Sí | Clona y analiza variables, sin puertos |
| POST | `/deployment/docker_files` | Sí | Busca Compose y extrae variables/puertos |
| POST | `/deployment` | Sí | Despliega un Compose |
| GET | `/deployment/project/:projectId` | Sí | Despliegues del proyecto |
| GET | `/deployment/:deploymentId/ports` | Sí | Asignaciones guardadas |
| POST | `/deployment/:deploymentId/stop` | Sí | Detiene despliegue |
| POST | `/deployment/:deploymentId/classify` | Sí | Clasifica servicios |
| GET | `/port` | No | Reservas existentes |
| POST | `/port` | Sí | Reserva provisional |
| DELETE | `/port/:projectId/:port` | Sí | Libera reserva provisional |

> [!note] Diferencias con README y Swagger
> La ruta actual de búsqueda es `/deployment/docker_files`; el README menciona `/project/docker_files`. Los decoradores Swagger describen algunos POST como HTTP 200, pero no fijan el código real con `@HttpCode`; Nest normalmente responde 201 a POST. Conviene comprobar la respuesta real al integrar clientes.

## Respuesta común

```json
{"success": true, "data": {}, "error": null, "meta": null}
```

Los errores usan `success: false`, `data: null` y `error` con `code`, `message` y, cuando corresponde, `details`. Las redirecciones OAuth quedan fuera del envoltorio. Las fechas serializadas se describen mediante contratos compartidos.

## Cuerpos habituales

Crear proyecto: `{ "name": "demo", "description": "Proyecto de ejemplo" }`.

Analizar archivos: `{ "projectId": 1 }` para `/deployment/docker_files`.

Reserva provisional: `{ "projectId": 1, "port": 3002 }` para `/port`.

El contrato `DeployComposeRequest` requiere `projectId` y `composePath`; admite `environment`, `ports` y `mirrorPorts`. Usa una ruta devuelta por el análisis. Cada variable tiene `key`, `value` y `service` opcional. Cada puerto tiene `service`, `hostIp`, `publishedPort`, `targetPort`, `protocol` y `mappingType`.

Consulta [[08 - Despliegues Docker]] antes de configurar `mirrorPorts`. Los contratos están en `packages/shared/src`, y las clases DTO en las carpetas de aplicación del backend.

## Fuentes del repositorio

- [src/project/presentation/project.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/project/presentation/project.controller.ts)
- [src/repository/presentation/repository.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/presentation/repository.controller.ts)
- [src/deployment/presentation/deployment.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/presentation/deployment.controller.ts)
- [src/ports/presentation/port.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/presentation/port.controller.ts)
- [src/shared/presentation/interceptors/api-response.interceptor.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/interceptors/api-response.interceptor.ts)
- [src/shared/presentation/filters/api-exception.filter.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/filters/api-exception.filter.ts)
- [packages/shared/src/repository/requests/deploy-compose.request.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/requests/deploy-compose.request.ts)
