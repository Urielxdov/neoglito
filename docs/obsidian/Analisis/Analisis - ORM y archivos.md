---
tags:
  - neoglito
  - analisis
  - documentacion-tecnica
funcionalidad: analisis
actualizado: 2026-10-10
---

# Análisis · ORM y archivos

## Consulta principal

```typescript
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: { repositories: true },
});
```

Si no existe, lanza `NotFoundException` con `The project with id N does not exist`. No se crea un proyecto desde el análisis ni se modifican sus asociaciones.

| Modelo | Campos relevantes |
| --- | --- |
| `Project` | `id: Int` autoincremental; `name` único; `description`; fechas; `repositories: Repository[]`; `deployments: Deployment[]` |
| `Repository` | `id: Int` sin autoincremento declarado; `name`; `gitUrl`; `cloneUrl` único; `projects: Project[]` |
| `GitHubConnection` | `userId` único; `username`; `accessToken` cifrado |

`Project` y `Repository` tienen relación muchos a muchos implícita en Prisma. El servicio toma `repository.cloneUrl` de la relación cargada. No hay un modelo `Analysis` ni una tabla de resultados de extracción.

El modelo de proyecto no declara un propietario `userId`. La consulta filtra solo por ID: la autenticación de las rutas no equivale a una comprobación de pertenencia del proyecto a ese usuario.

## Clonación y reutilización

`CloneRepositoryUseCase` valida una URL HTTPS de `github.com` y obtiene el último segmento de su ruta como nombre, quitando `.git`. Consulta `gitHubConnection.findUnique({ where: { userId } })`. Sin conexión, devuelve 404.

El destino es `resolve(process.cwd(), 'repo', username, repositoryName)`. Se validan el nombre y el username y se comprueba que el destino permanezca dentro de `repo`.

Si `access(destination)` tiene éxito, devuelve esa ruta inmediatamente. No verifica que sea un clone correcto, no hace `fetch`/`pull`, no selecciona rama ni verifica la vigencia del token. La conexión GitHub sí se consulta antes de reutilizarlo.

Para un destino nuevo, descifra `accessToken` y el adaptador ejecuta `git clone cloneUrl destination`. Entrega credenciales mediante `GIT_ASKPASS`, `GIT_USERNAME` y `GIT_PASSWORD`, con prompts interactivos desactivados. El script temporal de autenticación se elimina en `finally`.

El destino usa el username autenticado y el nombre corto del repositorio, sin incluir el propietario de la URL. Dos repositorios de distintos propietarios con el mismo nombre pueden apuntar al mismo destino. Clonaciones concurrentes al mismo destino tampoco tienen un bloqueo explícito.

## Descubrimiento recursivo

El patrón del análisis es:

```regex
(^|/)docker-compose.*\.yml$
```

| Nombre relativo | Descubierto |
| --- | --- |
| `docker-compose.yml` | Sí |
| `docker-compose.prod.yml` | Sí |
| `apps/api/docker-compose.local.yml` | Sí |
| `docker-compose.yaml` | No |
| `compose.yml` | No |
| `my-docker-compose.yml` | No |
| `Dockerfile` | No |

La búsqueda resuelve la raíz absoluta, recorre directorios mediante `readdir`, normaliza los separadores de la ruta relativa a `/` y devuelve rutas absolutas nativas. No excluye `.git`, `node_modules` u otras carpetas. Omite entradas que no sean archivos o directorios según `Dirent`; no sigue enlaces simbólicos explícitamente.

Una ruta inaccesible propaga la excepción de lectura. Los Compose encontrados se analizan individualmente: no se combinan archivos base y overrides.

## Fuentes del código

- [prisma/models/project.prisma](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/prisma/models/project.prisma)
- [prisma/models/repository.prisma](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/prisma/models/repository.prisma)
- [prisma/models/github-connection.prisma](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/prisma/models/github-connection.prisma)
- [src/analisys/application/project-analysis.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/application/project-analysis.service.ts)
- [src/repository/application/use-cases/repository/clone-repository.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/clone-repository.use-case.ts)
- [src/shared/infrastructure/git/git-repository-cloner.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/git/git-repository-cloner.service.ts)
- [src/shared/infrastructure/files/recursive-file-finder.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/files/recursive-file-finder.service.ts)
