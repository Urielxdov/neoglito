---
tags:
  - neoglito
  - project
  - documentacion-tecnica
funcionalidad: Project
actualizado: 2026-10-10
---

# Project · repositorios e inicialización

## Vincular un repositorio

ProjectController no contiene endpoints de vínculo. El frontend usa `repositoryService.create` para `POST /repository/registry` con projectId, id, name, gitUrl y cloneUrl. Ese método tampoco tiene guard JWT.

`CreateRepositoryUseCase` valida ids enteros positivos y cadenas recortadas no vacías, consulta `PROJECT_REPOSITORY.findById` y comprueba si ese cloneUrl ya está asociado al proyecto. Si ya lo está, devuelve 409.

El adaptador de Repository realiza upsert por id, actualiza metadatos y hace `projects.connect` con el proyecto recibido. Connect agrega la asociación; no sustituye todos los proyectos previos. Un mismo repositorio puede compartirse entre proyectos. Una colisión de cloneUrl con un id distinto puede causar un error de unicidad no traducido por ese caso de uso.

Los ids y URLs enviados se persisten; ese registro no consulta GitHub para demostrar pertenencia. La lista GitHub y el clonador son operaciones distintas. Véase [[Analisis - ORM y archivos]].

## Inicializar

Tras vincular secuencialmente los repositorios seleccionados, `useProjectCreation` llama `projectService.init({projectId})`. El controlador ubicado en Deployment delega a ProjectAnalysisService:

1. Carga el proyecto con repositorios desde Prisma; si no existe, 404.
2. Clona o reutiliza cada repositorio asociado, usando la identidad autenticada para el acceso GitHub.
3. Busca archivos `docker-compose*.yml` bajo las carpetas clonadas.
4. Analiza variables de entorno; con includePorts false evita extraer puertos.
5. Retorna resultados adaptados a InitProjectResponse; no escribe un estado “inicializado” en Project.

Un proyecto sin repositorios puede producir arrays vacíos. Un resultado exitoso sin Compose tampoco implica un despliegue utilizable. La búsqueda no equivale a validar Docker Compose completo. [[Analisis - Flujo]] y [[Analisis - Variables y puertos]] detallan las restricciones del descubrimiento y extracción.

El frontend de creación utiliza rutas clonadas y rutas Compose para llenar candidatos y elegir la primera ruta por repositorio. No utiliza en ese hook las environmentVariables que devuelve init. Al abrir posteriormente el proyecto, se usa el análisis completo y se cargan variables y puertos.

## Abrir un proyecto

`useProjectOpen` establece openId, busca el proyecto en la caché y llama `projectService.environmentVariables`. A pesar del nombre, ese método es un alias de `dockerFilesPath` y solicita `POST /deployment/docker_files`, que retorna rutas, análisis de variables y puertos.

Los repositorios usados para asociar las rutas en este hook se obtienen de la intersección de los ids vinculados y el listado de repositorios GitHub disponible. Un repositorio vinculado ausente de ese listado puede aparecer en el resumen mediante fallback, pero no recibe esas asignaciones desde este hook.

Los helpers relacionan repositorios con clones por basename y nombre corto en minúsculas. Luego seleccionan archivos por prefijo de ruta normalizada con `/`. No se transporta un vínculo explícito repositoryId→ruta desde el backend; dos repositorios con el mismo nombre corto pueden asociarse incorrectamente. Los candidatos preservan el orden recibido y se elige el primero, sin una regla de preferencia por entorno.

## Persistencia y fallos parciales

| Punto de fallo | Qué puede permanecer | Comportamiento del hook |
|---|---|---|
| Create Project | Si falla antes de persistir, nada nuevo | Mostrar error y finalizar |
| Vínculo número N | Proyecto y vínculos anteriores | Detener vínculos posteriores, refrescar listado |
| Init/análisis | Proyecto, vínculos y clones ya creados | Mostrar error y refrescar listado |
| Clasificación después de desplegar | Deployment y contenedores ya creados | La interfaz conserva el despliegue y reporta fallo de clasificación |

No hay rollback de requests anteriores ni cancelación automática de clones ya iniciados. La interfaz conserva formulario y selección cuando el recorrido falla. Reenviar el registro completo con el mismo nombre puede recibir 409 porque el proyecto ya existe. El endpoint update no completa vínculos pendientes; deben registrarse los faltantes usando el id existente y luego repetir init si procede.

## De Project a Deployment

`useProjectAnalysis.startAnalysis` toma el proyecto activo, repositorios y configuración Compose del estado. Para cada repositorio con ruta no vacía crea un request de despliegue y llama deployAndClassify. Las tareas se lanzan sin esperar una a otra. Entrar en la fase visual analyze puede iniciar contenedores: no es únicamente lectura de YAML.

Cerrar esa vista modifica estado de interfaz, no detiene Docker. Los resultados persistidos, reservas y parada pertenecen a [[Deployment - Flujo y estados]] y [[Ports - Reservas ciclo completo]].

Volver a [[Project - Indice]].

## Fuentes del código

- [src/repository/application/use-cases/repository/create-repository.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/create-repository.use-case.ts)
- [src/repository/infrastructure/persistence/prisma-repository.repository.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/infrastructure/persistence/prisma-repository.repository.ts)
- [src/repository/presentation/repository.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/presentation/repository.controller.ts)
- [src/analisys/application/project-analysis.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/application/project-analysis.service.ts)
- [src/deployment/presentation/deployment.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/presentation/deployment.controller.ts)
- [apps/web/src/features/projects/hooks/use-project-creation.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/hooks/use-project-creation.ts)
- [apps/web/src/features/projects/hooks/use-project-open.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/hooks/use-project-open.ts)
- [apps/web/src/features/projects/hooks/use-project-analysis.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/hooks/use-project-analysis.ts)
- [apps/web/src/features/projects/compose.helpers.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/compose.helpers.ts)
