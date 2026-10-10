---
tags:
  - neoglito
  - repository
  - documentacion-tecnica
funcionalidad: Repository
actualizado: 2026-10-10
---

# Repository · endpoints

No hay prefijo global de API. Los POST conservan el estado 201 predeterminado de Nest; GET devuelve 200. El interceptor global envuelve éxitos y el filtro global envuelve errores.

| Método y ruta | JWT | Entrada | data de éxito |
|---|---|---|---|
| GET /repository/all | Sí | Sin parámetros | RepositoryResponse[] remoto |
| POST /repository/registry | No | projectId, id, name, gitUrl, cloneUrl | CreateRepositoryResponse |
| POST /repository/clone | Sí | cloneUrl | `{pathSystem:string}` |

No hay rutas HTTP para listar la tabla local, leer por id, editar, eliminar, desvincular, seleccionar rama, actualizar copia local o consultar progreso. Listado y clone utilizan request.user.id del JWT; no se acepta userId en sus cuerpos.

## GET /repository/all

```http
GET /repository/all
Authorization: Bearer <JWT>
```

Consulta GitHub usando la conexión local. Un elemento ilustrativo de data:

```json
{
  "id": 235,
  "name": "equipo/catalogo",
  "private": true,
  "description": "Servicios del catálogo",
  "language": "TypeScript",
  "gitUrl": "git://github.com/equipo/catalogo.git",
  "cloneUrl": "https://github.com/equipo/catalogo.git",
  "updatedAt": "2026-10-10T12:00:00Z"
}
```

No acepta paginación del cliente, y el servidor solicita solo per_page=100. No contiene projectIds ni rutas de disco. El array puede estar vacío y aun ser una respuesta exitosa.

## POST /repository/registry

```http
POST /repository/registry
Content-Type: application/json

{
  "projectId": 1,
  "id": 235,
  "name": "equipo/catalogo",
  "gitUrl": "git://github.com/equipo/catalogo.git",
  "cloneUrl": "https://github.com/equipo/catalogo.git"
}
```

projectId e id deben ser numbers enteros positivos; strings numéricos no pasan. Las tres cadenas se recortan y deben tener contenido. gitUrl y cloneUrl no se validan como URLs en este endpoint. El nombre no necesita formato owner/repo.

El proyecto debe existir. No se verifica propietario ni acceso GitHub. Este método no tiene JwtAuthGuard; tampoco hay guard de clase ni global en AppModule. Guarda o actualiza un registro por id y agrega el proyecto. Devuelve los mismos cinco campos con las cadenas persistidas; projectId representa el vínculo solicitado, no una propiedad escalar del modelo actual Repository.

## POST /repository/clone

```http
POST /repository/clone
Authorization: Bearer <JWT>
Content-Type: application/json

{"cloneUrl":"https://github.com/equipo/catalogo.git"}
```

Exige URL HTTPS con hostname github.com y nombre final válido según el caso de uso. No exige projectId ni repositoryId. La respuesta 201 también se utiliza cuando solo se reutiliza un destino existente.

```json
{
  "success": true,
  "data": {"pathSystem":"/backend/repo/ana/catalogo"},
  "error": null,
  "meta": null
}
```

La ruta es del servidor y su forma depende del sistema operativo y cwd. No representa una URL descargable ni una carpeta creada en el navegador del usuario.

## Errores

| Estado | Operación y causa |
|---|---|
| 400 | Registro con ids/cadenas inválidos; cloneUrl, username o destino inválidos |
| 401 | JWT ausente o inválido en all/clone |
| 404 | Proyecto inexistente al registrar; conexión GitHub ausente al listar/clonar |
| 409 | cloneUrl ya vinculado al proyecto, detectado antes de upsert |
| 502 | Respuesta HTTP no exitosa de GitHub al listar |
| 500 | Descifrado, Prisma, error de ejecución Git/clone, errores de red/JSON no traducidos o tipos runtime incorrectos en trim |

La envoltura de error contiene success false, data null, error con code/message y meta null. Un fallo de permisos de clonación se expresa como 500 del adaptador, no como 401/403 específico de GitHub. Los DTO Swagger describen campos, pero no aplican validación runtime. Véase [[Autenticacion - JWT cookie y cifrado]] para cookie access_token y Bearer.

Volver a [[Repository - Indice]].

## Fuentes del código

- [src/repository/presentation/repository.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/presentation/repository.controller.ts)
- [src/repository/application/dto/create-repository.dto.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/dto/create-repository.dto.ts)
- [src/repository/application/dto/clone-repository.dto.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/dto/clone-repository.dto.ts)
- [packages/shared/src/repository/responses/repository.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/repository.response.ts)
- [packages/shared/src/repository/responses/create-repository.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/create-repository.response.ts)
- [packages/shared/src/repository/responses/clone-repository.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/clone-repository.response.ts)
- [src/shared/presentation/interceptors/api-response.interceptor.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/interceptors/api-response.interceptor.ts)
- [src/shared/presentation/filters/api-exception.filter.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/filters/api-exception.filter.ts)
- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
- [src/app.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/app.module.ts)
