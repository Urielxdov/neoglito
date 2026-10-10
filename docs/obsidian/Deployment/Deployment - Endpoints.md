---
tags:
  - neoglito
  - deployment
  - documentacion-tecnica
funcionalidad: deployment
actualizado: 2026-10-10
---

# Deployment · endpoints

Todos los métodos de DeploymentController y ProjectDeploymentController usan JwtAuthGuard. Autenticación mediante cookie access_token o Bearer JWT. Solo descubrimiento y despliegue reciben request.user.id; listar, detener, clasificar y consultar puertos operan con el ID recibido y no comprueban pertenencia del recurso al usuario. Autenticar no equivale a validar propiedad del proyecto.

## Rutas

| Método y ruta | Parámetros | Resultado data | Éxito esperado |
| --- | --- | --- | --- |
| POST /deployment/docker_files | Body projectId number | clonedRepositoryPaths, dockerFilesPath, composeAnalyses con variables y puertos | 201 |
| POST /project/init | Body projectId number | clonedRepositoryPaths, dockerComposePaths, composeAnalyses sin puertos | 201 |
| POST /deployment | DeployComposeRequest | DeploymentResponse | 201 |
| GET /deployment/project/:projectId | projectId con ParseIntPipe | DeploymentResponse[] ordenados createdAt desc | 200 |
| GET /deployment/:deploymentId/ports | deploymentId string | DeploymentPortsResponse | 200 |
| POST /deployment/:deploymentId/classify | deploymentId string; sin body utilizado | DeploymentResponse actualizado | 201 |
| POST /deployment/:deploymentId/stop | deploymentId string; sin body utilizado | DeploymentResponse detenido | 201 |

Son estados inferidos de decoradores, sin verificación HTTP en vivo. docker_files, init y stop declaran 200 en Swagger pero no tienen HttpCode: mantienen el 201 predeterminado de POST. IDs de despliegue se describen como UUID en Swagger, pero no usan ParseUUIDPipe.

Las dos rutas de análisis se implementan aquí y delegan en ProjectAnalysisService. Su comportamiento detallado está en [[Analisis - Endpoints]]. No crean Deployment ni llaman a up.

## Body para desplegar

| Campo | Tipo esperado | Uso |
| --- | --- | --- |
| projectId | number, requerido | Proyecto cuyos repositorios se revisan |
| composePath | string, requerido | Ruta del backend que debe coincidir con un candidato descubierto |
| environment | Array opcional de {service?: string, key: string, value: string} | Sobrescribir o agregar variables |
| ports | Array opcional ComposePort | Modificar mappings existentes |
| mirrorPorts | boolean opcional | Adaptar también target y listener; default funcional false |

ComposePort usa service string, hostIp string/null, publishedPort string/null, targetPort string, protocol string y mappingType one-to-one/range. Para desplegar el preparador admite protocol tcp/udp; mappingType no controla su validación. Debe conservarse la identidad del mapping original.

Los DTO solo agregan metadatos Swagger. main no configura ValidationPipe; no hay validación automática integral del body. Las comprobaciones de variables, servicios y puertos las realiza el preparador. No se debe interpretar ApiProperty como validación ejecutable.

## Respuesta del despliegue

```json
{
  "success": true,
  "data": {
    "id": "uuid-del-despliegue",
    "projectId": 12,
    "composePath": "/app/.neoglito/deployments/.neoglito-uuid-del-despliegue.compose.yml",
    "status": "running",
    "createdAt": "2026-10-10T06:00:00.000Z",
    "startedAt": "2026-10-10T06:00:02.000Z",
    "finishedAt": null,
    "services": [{
      "id": "id-docker",
      "composeServiceName": "api",
      "port": 8080,
      "status": "running",
      "health": "none",
      "serviceType": "UNKNOWN",
      "lastObservedAt": "2026-10-10T06:00:02.000Z",
      "deploymentId": "uuid-del-despliegue"
    }]
  },
  "error": null,
  "meta": null
}
```

IDs ilustrativos, no UUIDs reales para enviar. Las fechas son ISO. El envelope lo agrega ApiResponseInterceptor. Listar devuelve estos objetos en data array; stop/classify devuelven un objeto. No hay GET de detalle general ni endpoint de borrado o reinicio en este controlador.

## Consulta de puertos

data incluye deploymentId, projectId, status, sourceComposePath, projectDirectory y services con containerId, composeServiceName, port number/null.

Solo building/starting/running se consideran activos. Para esos estados lee procedencia desde el YAML y devuelve port si es > 0. Fuera de ellos devuelve metadatos null y port null. No inspecciona Docker ni consulta Redis. En estados iniciales puede no haber filas de servicios todavía.

## Errores

| Estado | Casos del código |
| --- | --- |
| 400 | Ruta ajena al proyecto, YAML ilegible/servicios inválidos, variables/puertos/espejo inválidos, ParseIntPipe |
| 401 | JWT ausente, inválido o expirado |
| 404 | Proyecto o deployment inexistente; descubrimiento también puede fallar por conexión GitHub ausente |
| 409 | Clasificación sin servicios, IDs faltantes/no running, observación/inspección fallida o resultado incompleto |
| 500 | Errores no convertidos: reservas, Docker durante deploy/stop, lectura de metadatos, Prisma u otros |

ApiExceptionFilter mantiene el status de HttpException; para otros errores usa 500 y puede devolver Error.message. El body de error es `{success:false,data:null,error:{code,message},meta:null}`, con details cuando corresponde a una lista de mensajes. La compensación no cambia el código HTTP original por el mero hecho de guardar failed.

## Fuentes del código

- [src/deployment/presentation/deployment.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/presentation/deployment.controller.ts)
- [src/deployment/application/dto/deploy-compose.dto.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/dto/deploy-compose.dto.ts)
- [packages/shared/src/repository/requests/deploy-compose.request.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/requests/deploy-compose.request.ts)
- [packages/shared/src/repository/responses/project-docker-files.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/project-docker-files.response.ts)
- [packages/shared/src/repository/responses/deployment.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/deployment.response.ts)
- [src/deployment/application/use-cases/get-deployment-ports.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/get-deployment-ports.use-case.ts)
- [src/shared/presentation/interceptors/api-response.interceptor.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/interceptors/api-response.interceptor.ts)
- [src/shared/presentation/filters/api-exception.filter.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/filters/api-exception.filter.ts)
- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
