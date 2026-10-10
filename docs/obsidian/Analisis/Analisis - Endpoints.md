---
tags:
  - neoglito
  - analisis
  - documentacion-tecnica
funcionalidad: analisis
actualizado: 2026-10-10
---

# Análisis · endpoints

Las rutas pertenecen a controladores declarados en `DeploymentModule`; `AnalysisModule` no tiene un prefijo HTTP propio ni un endpoint `/analysis`.

## Autenticación y parámetros comunes

Ambas rutas están protegidas por `JwtAuthGuard`. Aceptan el JWT de sesión por cookie `access_token` o por `Authorization: Bearer <JWT>`. El usuario se obtiene de `request.user.id`; no se envía `userId` en el cuerpo.

| Parámetro | Ubicación | Tipo esperado | Propósito |
| --- | --- | --- | --- |
| `projectId` | JSON body | number | Proyecto cuyos repositorios se buscarán |

No tienen parámetros de ruta ni query. Los DTO usan `@ApiProperty`, sin validadores; `main.ts` no configura `ValidationPipe`. El contrato espera un ID numérico existente, pero no garantiza rechazar de forma limpia tipos incorrectos o un ID ausente. No debe asumirse que toda entrada inválida produce 400.

## POST /deployment/docker_files

Ejecuta `analyzeProject(userId, projectId)` con puertos habilitados. Devuelve rutas, variables y puertos, aunque la descripción Swagger mencione principalmente variables.

```http
POST /deployment/docker_files
Authorization: Bearer <JWT>
Content-Type: application/json

{"projectId": 12}
```

Ejemplo de respuesta para un Compose con `PORT: ${PORT:-3000}` y puerto `8080:3000`:

```json
{
  "success": true,
  "data": {
    "clonedRepositoryPaths": ["/app/repo/usuario/api"],
    "dockerFilesPath": ["/app/repo/usuario/api/docker-compose.yml"],
    "composeAnalyses": [
      {
        "dockerComposePath": "/app/repo/usuario/api/docker-compose.yml",
        "environmentVariables": [
          {
            "service": "api",
            "name": "PORT",
            "source": "interpolation",
            "value": "PORT",
            "defaultValue": "3000"
          }
        ],
        "ports": [
          {
            "service": "api",
            "hostIp": null,
            "publishedPort": "8080",
            "targetPort": "3000",
            "protocol": "tcp",
            "mappingType": "one-to-one"
          }
        ]
      }
    ]
  },
  "error": null,
  "meta": null
}
```

Las rutas son del backend: en Windows o con otro directorio de trabajo serán diferentes. Las estructuras públicas se declaran en `ProjectDockerFilesResponse` del paquete compartido.

## POST /project/init

Recibe el mismo cuerpo `{"projectId": 12}`. Ejecuta `analyzeProject` con `{ includePorts: false }` y adapta el resultado a `InitProjectResponse`:

```typescript
{
  clonedRepositoryPaths: string[];
  dockerComposePaths: string[];
  composeAnalyses: {
    dockerComposePath: string;
    environmentVariables: EnvironmentVariable[];
  }[];
}
```

Esta estructura va en `data` dentro del mismo envelope. Usa `dockerComposePaths`, en lugar de `dockerFilesPath`, y omite `ports`. No basta con cambiar la URL y reutilizar sin adaptación todos los accesos a la respuesta anterior.

## Estado HTTP y errores

Ambas rutas son `@Post` sin `@HttpCode`. El estado de éxito esperado por la configuración actual de Nest es **201**, aunque Swagger declara **200** para ellas. El interceptor global envuelve los datos y no cambia ese estado. No se comprobó mediante una llamada HTTP real durante esta documentación.

| Estado | Causa observada en código |
| --- | --- |
| 401 | JWT ausente, inválido o expirado |
| 404 | Proyecto inexistente; conexión GitHub del usuario inexistente |
| 400 | URL de clonación o username rechazados por el caso de uso |
| 500 | Git no ejecutable, clonación fallida, errores genéricos de Prisma, lectura o parseo |

Un proyecto sin repositorios o sin Compose compatibles es una respuesta exitosa con listas vacías, no un 404.

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "Not Found",
    "message": "The project with id 12 does not exist"
  },
  "meta": null
}
```

`ApiExceptionFilter` conserva el estado de una `HttpException`; para excepciones genéricas usa 500 y puede devolver su `Error.message`. El mensaje concreto depende del fallo. Swagger se expone en `/docs`.

## Fuentes del código

- [src/deployment/presentation/deployment.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/presentation/deployment.controller.ts)
- [src/deployment/deployment.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/deployment.module.ts)
- [src/deployment/application/dto/project-compose-files.dto.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/dto/project-compose-files.dto.ts)
- [src/deployment/application/dto/init-project.dto.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/dto/init-project.dto.ts)
- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
- [src/auth/infrastructure/passport/jwt.strategy.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/infrastructure/passport/jwt.strategy.ts)
- [src/shared/presentation/interceptors/api-response.interceptor.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/interceptors/api-response.interceptor.ts)
- [src/shared/presentation/filters/api-exception.filter.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/filters/api-exception.filter.ts)
- [packages/shared/src/repository/responses/project-docker-files.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/project-docker-files.response.ts)
- [packages/shared/src/repository/responses/init-project.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/init-project.response.ts)
