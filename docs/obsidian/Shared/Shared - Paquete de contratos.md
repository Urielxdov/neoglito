---
tags:
  - neoglito
  - shared
  - documentacion-tecnica
funcionalidad: Shared
actualizado: 2026-10-10
---

# Shared · paquete de contratos

## Distribución

`@neoglito/shared` es un workspace privado, ESM, de versión 0.0.0. package.json exporta el índice principal y subrutas api, auth, repository, ports y text. Sus entradas types/import apuntan a archivos TypeScript de src; no se declara un build independiente en este package.json.

tsconfig del paquete usa strict, target ES2023, resolución bundler y noEmit. El build del backend incluye packages/shared/src junto con src en tsconfig.build. El frontend reexporta tipos mediante apps/web/src/shared/api/contracts.ts.

El índice raíz exporta tipos de api/auth/ports/repository y la función runtime normalizeText. Esta función solo aplica trim y lowerCase: no elimina acentos, colapsa espacios internos ni valida el texto. No se encontraron consumidores actuales fuera de su definición/export.

## Contrato HTTP general

```ts
interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: ApiError | null
  meta: ApiMeta | null
}
```

ApiError contiene code:string, message:string y details opcional unknown. ApiMeta tiene page, limit y total opcionales. La interfaz permite combinaciones que el productor normal no utiliza, como success true con error no nulo: no es una unión discriminada que imponga esos invariantes. Interceptor y filtro concretan los valores habituales.

IsoDateString es un alias de string, sin marca ni comprobación runtime de ISO. AuthenticatedUserResponse tiene id:number y username:string.

## Requests y rutas consumidoras

| Contrato | Campos | Uso |
|---|---|---|
| CreateProjectRequest / UpdateProjectRequest | name, description | Registro/edición Project |
| CreateRepositoryRequest | projectId, id, name, gitUrl, cloneUrl | Registro y vínculo Repository |
| CloneRepositoryRequest | cloneUrl | Clonación |
| InitProjectRequest / ProjectComposeFilesRequest | projectId | Inicialización o análisis Compose |
| DeployComposeRequest | projectId, composePath, environment?, ports?, mirrorPorts? | Deployment |
| ReservePortRequest | projectId, port | Reserva provisional |

DeployComposeEnvironmentVariable tiene service opcional, key y value. Sin service se aplica a todos los servicios del archivo en el preparador. ports usa ComposePort, con puertos string y datos sin resolver. mirrorPorts describe configuración del listener y publicación del mismo número; su implementación y limitaciones pertenecen a Deployment.

## Responses y diferencias

| Contrato | Datos principales |
|---|---|
| CreateProjectResponse | Metadatos y fechas ISO |
| ProjectResponse | Lo anterior y repositories `{id,name}` |
| CreateRepositoryResponse | Metadatos y projectId del vínculo solicitado |
| RepositoryResponse | Catálogo GitHub con private, description, language y updatedAt |
| CloneRepositoryResponse | pathSystem |
| InitProjectResponse | clonedRepositoryPaths, dockerComposePaths, análisis de variables |
| ProjectDockerFilesResponse | clonedRepositoryPaths, dockerFilesPath, análisis de variables y puertos |
| DeploymentResponse | Id, proyecto, ruta, status, fechas y services |
| DeploymentPortsResponse | Estado, rutas de origen y services con port nullable |
| PortReservationsResponse | Mapa ownerReservationKey → string de clave de puerto |

dockerComposePaths de init y dockerFilesPath del análisis completo son nombres distintos del contrato, no aliases de JSON. Los análisis de init no incluyen ports. DeploymentServiceResponse tiene port:number, mientras que DeploymentPortsResponse puede usar port:null para servicios sin una asignación activa. No deben sustituirse esos contratos entre sí.

status, health y serviceType de Deployment son strings en el paquete, no enums importados de Prisma. Las categorías reconocidas se documentan en las funcionalidades correspondientes; las interfaces no restringen todos sus valores posibles.

## Duplicaciones de tipos

EnvironmentVariable y ComposePort tienen representaciones estructurales en src/shared/application y packages/shared. El backend no utiliza una sola definición para ambas capas. Mantener cambios requiere revisar esas definiciones, los DTO/respuestas, Swagger y consumidores del frontend.

No todas las interfaces internas de los archivos están reexportadas por el barrel repository: por ejemplo EnvironmentVariable se declara en init-project.response y se usa mediante una subruta. No asumir que cualquier símbolo de un archivo se importa desde la raíz del paquete.

Los tipos no validan JSON, fechas, propiedad de proyectos ni URLs al ejecutar. Las reglas runtime están en casos de uso, preparadores o schemas Zod concretos; véanse [[Project - Implementacion y contratos]] y [[Repository - Implementacion y contratos]].

Volver a [[Shared - Indice]].

## Fuentes del código

- [packages/shared/package.json](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/package.json)
- [packages/shared/tsconfig.json](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/tsconfig.json)
- [packages/shared/src/index.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/index.ts)
- [packages/shared/src/api/api-response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/api/api-response.ts)
- [packages/shared/src/api/iso-date-string.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/api/iso-date-string.ts)
- [packages/shared/src/repository/index.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/index.ts)
- [packages/shared/src/repository/responses/init-project.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/init-project.response.ts)
- [packages/shared/src/repository/responses/project-docker-files.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/project-docker-files.response.ts)
- [packages/shared/src/repository/responses/deployment.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/deployment.response.ts)
- [packages/shared/src/repository/responses/deployment-ports.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/deployment-ports.response.ts)
- [packages/shared/src/repository/requests/deploy-compose.request.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/requests/deploy-compose.request.ts)
- [packages/shared/src/text/normalize-text.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/text/normalize-text.ts)
- [tsconfig.build.json](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/tsconfig.build.json)
