---
tags:
  - neoglito
  - documentacion
actualizado: 2026-10-10
tipo: documentacion-tecnica
---

# Repositorios y análisis Compose

`CloneRepositoryUseCase` busca la conexión GitHub del usuario, valida una URL HTTPS de `github.com`, obtiene el nombre y clona en `repo/<username>/<repositoryName>`. Si el destino ya existe, lo devuelve directamente: este flujo no realiza un pull para actualizarlo.

`ProjectAnalysisService` carga el proyecto con sus repositorios, los clona en paralelo y busca archivos recursivamente. Después analiza variables y, cuando se solicita, puertos. Un proyecto inexistente produce NotFound.

## Dos operaciones de análisis

- `/project/init` devuelve `clonedRepositoryPaths`, `dockerComposePaths` y variables por Compose; llama al análisis con `includePorts: false`.
- `/deployment/docker_files` devuelve `clonedRepositoryPaths`, `dockerFilesPath` y `composeAnalyses` con variables y puertos.

El puerto incluye servicio, IP host, puerto publicado, puerto interno, protocolo y tipo de mapeo. La extracción de variables y puertos utiliza adaptadores YAML separados.

> [!note] Nombres detectados por el flujo actual
> `ProjectAnalysisService` usa `/(^|\/)docker-compose.*\.yml$/`. Por tanto, no debe asumirse que descubre `compose.yaml`, `compose.yml`, `docker-compose.yaml` o Dockerfiles. Existe otro caso de uso, `FindDockerFilesUseCase`, con patrones más amplios, pero el flujo revisado de análisis usa el buscador anterior.

Las rutas encontradas se utilizan para seleccionar un archivo autorizado al desplegar. Consulta [[08 - Despliegues Docker]] y [[12 - Diagnostico y limites]].

## Fuentes del repositorio

- [src/analisys/application/project-analysis.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/application/project-analysis.service.ts)
- [src/repository/application/use-cases/repository/clone-repository.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/clone-repository.use-case.ts)
- [src/shared/application/find-docker-files.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/find-docker-files.ts)
