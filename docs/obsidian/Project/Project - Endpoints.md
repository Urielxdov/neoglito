---
tags:
  - neoglito
  - project
  - documentacion-tecnica
funcionalidad: Project
actualizado: 2026-10-10
---

# Project · endpoints

Las rutas no tienen prefijo global. Los ejemplos usan `http://localhost:3000`; el puerto real depende de PORT. Swagger se publica en `/docs`.

## Mapa

| Método y ruta | JWT | Parámetros | Éxito real | Implementación |
|---|---|---|---|---|
| POST /project/registry | No | JSON name, description | 201 | ProjectController |
| GET /project | Sí | Ninguno | 200 | ProjectController |
| POST /project/:id/update | Sí | id en ruta; JSON name, description | 201 | ProjectController |
| POST /project/init | Sí | JSON projectId | 201 | ProjectDeploymentController, en Deployment |

No hay GET por id, PATCH, PUT, DELETE ni paginación en ProjectController. Swagger describe actualización e inicialización como 200, pero no hay `@HttpCode(200)`: los POST conservan el 201 predeterminado.

## Crear

```http
POST /project/registry
Content-Type: application/json

{"name":"Tienda","description":"Backend y frontend del catálogo"}
```

Ambos campos son obligatorios y se recortan. Una cadena con solo espacios es inválida. El cuerpo no acepta repositorios como parte del contrato; no los vincula aunque el cliente añada otras propiedades. No se exige JWT en este método ni en toda la clase, y no hay guard global registrado en AppModule.

Ejemplo ilustrativo de respuesta:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Tienda",
    "description": "Backend y frontend del catálogo",
    "createdAt": "2026-10-10T12:00:00.000Z",
    "updatedAt": "2026-10-10T12:00:00.000Z"
  },
  "error": null,
  "meta": null
}
```

## Listar

```http
GET /project
Authorization: Bearer <JWT>
```

Devuelve `data: ProjectResponse[]`; si no hay registros, `[]`. Cada elemento tiene los campos de creación y `repositories: [{"id":123,"name":"organizacion/backend"}]`. El orden es updatedAt descendente; no hay orden secundario declarado ni orden explícito de repositorios.

El guard autentica pero el método no recibe request ni userId. Pese a los textos de Swagger sobre proyectos del usuario, el repositorio consulta todos los proyectos. No hay filtro de autorización por propietario.

## Actualizar

```http
POST /project/1/update
Authorization: Bearer <JWT>
Content-Type: application/json

{"name":"Tienda principal","description":"Servicios del catálogo"}
```

`:id` usa ParseIntPipe. Un texto no numérico produce 400. No hay validación explícita de id positivo; un entero sin proyecto termina en 404. Los dos campos deben enviarse: no es una actualización parcial. La respuesta es ProjectResponse, incluyendo repositorios. Conservar el mismo nombre se permite para el propio id. No modifica vínculos ni contenedores.

## Inicialización delegada

`POST /project/init`, body `{"projectId":1}`, llama `ProjectAnalysisService.analyzeProject(request.user.id, projectId, {includePorts:false})`. Devuelve `clonedRepositoryPaths`, `dockerComposePaths` y `composeAnalyses` con dockerComposePath y environmentVariables. No incluye puertos en esos análisis ni crea Deployment. El userId se usa para acceso al clonador, no para comprobar propietario del proyecto.

Consultar [[Analisis - Endpoints]] y [[Project - Repositorios e inicializacion]] para los detalles. La implementación y el DTO están en Deployment, aunque la URL empieza por project.

## Autenticación y errores

El guard admite cookie `access_token` o Bearer; véase [[Autenticacion - JWT cookie y cifrado]]. El frontend usa credentials include. No hay una comprobación adicional de autorización por proyecto en estos casos de uso.

| Estado | Causa |
|---|---|
| 400 | Campos vacíos/ausentes o id de ruta no parseable |
| 401 | JWT inválido o ausente en rutas protegidas |
| 404 | Proyecto inexistente al editar; proyecto inexistente en init |
| 409 | Nombre ya existente detectado antes de guardar |
| 500 | Error Prisma, carrera de unicidad no traducida, tipo incorrecto al usar trim o id ausente en respuesta interna |

La envoltura de error global usa `success:false`, `data:null`, `error:{code,message}` y `meta:null`. Los errores de Nest pueden incluir details si traen una lista de mensajes. No se aplica ValidationPipe ni validación runtime basada en las interfaces TypeScript.

Volver a [[Project - Indice]].

## Fuentes del código

- [src/project/presentation/project.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/project/presentation/project.controller.ts)
- [src/deployment/presentation/deployment.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/presentation/deployment.controller.ts)
- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
- [src/app.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/app.module.ts)
- [src/shared/presentation/interceptors/api-response.interceptor.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/interceptors/api-response.interceptor.ts)
- [src/shared/presentation/filters/api-exception.filter.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/filters/api-exception.filter.ts)
