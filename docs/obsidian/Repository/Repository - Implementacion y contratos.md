---
tags:
  - neoglito
  - repository
  - documentacion-tecnica
funcionalidad: Repository
actualizado: 2026-10-10
---

# Repository · implementación y contratos

## Módulo y proveedores

RepositoryModule importa AuthModule, PrismaModule y ProjectModule. Registra RepositoryController y tres casos de uso: CreateRepositoryUseCase, GetRepositoriesUseCase y CloneRepositoryUseCase.

| Token | Implementación mediante useClass | Consumidor |
|---|---|---|
| REPOSITORY_REPOSITORY | PrismaRepositoryRepository | Registro de metadatos y vínculos |
| ENCRYPTION_PORT | Aes256GcmEncryptionService | Listado GitHub y clonación |
| GIT_CLONER_PORT | GitCloneRepositoryService | Clonación |
| PROJECT_REPOSITORY | Exportado por ProjectModule | Comprobar existencia del proyecto al registrar |

El módulo exporta **CloneRepositoryUseCase**. No exporta REPOSITORY_REPOSITORY, el controlador ni los otros casos de uso. Análisis importa el módulo para consumir el caso de uso exportado.

La consulta GitHub usa fetch directamente dentro de GetRepositoriesUseCase; no existe aquí un puerto de cliente GitHub. El archivo infrastructure/github/github-repository.response.ts declara la forma esperada del JSON, pero no ejecuta la petición ni valida su forma durante la ejecución.

## Entidad Repository

El constructor asigna campos readonly id:number, projectIds:number[], name:string, gitUrl:string y cloneUrl:string. No tiene métodos, validación, fechas, visibilidad ni ruta de clonación. El array projectIds resume las relaciones incluidas desde Prisma; no representa un propietario.

## Puerto de persistencia

| Método | Retorno | Semántica actual |
|---|---|---|
| save(repository) | Promise de Repository | upsert por id, agregar conexiones a proyectos |
| findById(id) | Promise de Repository | Incluye proyectos; lanza 404 si falta |
| findByProjectIdAndCloneUrl(projectId, cloneUrl) | Promise de Repository o null | Busca cloneUrl con projects.some por id |

No hay métodos para listar registros locales, eliminar, desvincular, guardar ruta local ni sincronizar todo el catálogo GitHub.

## Puerto de clonación

`GIT_CLONER_PORT` identifica `RepositoryClonerPort.clone(cloneUrl, username, accessToken, destination): Promise<string>`. El adaptador recibe ya resueltos el destino y las credenciales. La validación GitHub y la decisión de reutilizar un destino pertenecen al caso de uso, no al adaptador Git.

## DTO y contratos compartidos

`CreateRepositoryDto` tiene projectId, id, name, gitUrl y cloneUrl. `CloneRepositoryDto` tiene cloneUrl. Ambos implementan interfaces compartidas y usan ApiProperty de Swagger sin decoradores de validación. Main tampoco configura ValidationPipe.

CreateRepositoryRequest local copia los cinco campos en propiedades readonly. CreateRepositoryResponse devuelve id, el projectId solicitado, name, gitUrl y cloneUrl. No incluye todos los projectIds persistidos.

RepositoryResponse, usado en el listado remoto, incluye id, name, private, description, language, gitUrl, cloneUrl y updatedAt ISO. CloneRepositoryResponse contiene únicamente pathSystem. Los contratos se encuentran en `packages/shared/src/repository`.

La validación del registro usa Number.isInteger y comparación positiva para los ids; no convierte strings numéricos. Las cadenas pasan por optional chaining y trim. Nulos y vacíos terminan en 400, pero valores no string pueden lanzar TypeError y terminar en 500 antes del bloque de validación.

Volver a [[Repository - Indice]].

## Fuentes del código

- [src/repository/repository.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/repository.module.ts)
- [src/repository/domain/entities/repository/repository.entity.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/domain/entities/repository/repository.entity.ts)
- [src/repository/domain/entities/repository/repository.repository.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/domain/entities/repository/repository.repository.ts)
- [src/shared/application/repository-cloner.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/repository-cloner.port.ts)
- [src/repository/application/dto/create-repository.dto.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/dto/create-repository.dto.ts)
- [src/repository/application/dto/clone-repository.dto.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/dto/clone-repository.dto.ts)
- [src/repository/infrastructure/github/github-repository.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/infrastructure/github/github-repository.response.ts)
- [packages/shared/src/repository/responses/repository.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/repository.response.ts)
- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
