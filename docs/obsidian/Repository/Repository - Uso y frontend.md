---
tags:
  - neoglito
  - repository
  - documentacion-tecnica
funcionalidad: Repository
actualizado: 2026-10-10
---

# Repository · uso y frontend

## Servicio y caché

repositoryService expone getAll para GET /repository/all y create para POST /repository/registry. No expone clone: la clonación que usa la interfaz se produce a través del análisis de proyectos en el backend.

`useRepositories` mantiene una query con clave `['repositories']`. La función solicita el catálogo remoto y lanza Error si success es falso o falta data. Aplica toRepository para presentar updatedAt como fecha localizada es-MX con día, mes corto y año. Ese campo mostrado deja de ser el ISO original; no es la fecha de un vínculo Project ni del clone local.

El hook devuelve allRepositories, isLoading, isError, error y createRepository. No declara polling, timeout, retry o staleTime propios, ni expone aquí un método refresh. La clave no incluye userId; su aislamiento entre sesiones depende del manejo general de la caché, no de este hook.

La mutación createRepository valida con Zod ids enteros positivos y cadenas recortadas no vacías. Retorna la respuesta del servicio sin comprobar success ni invalidar queries automáticamente. En el recorrido de creación de proyectos, `useProjectCreation` llama repositoryService.create directamente y comprueba success; no atraviesa esa mutación Zod.

## Selección y búsqueda

RepositoriesProvider mantiene query y selectedIds como Set. Aunque su estado inicial también declara status, repositories y message, los datos de servidor y flags de carga visibles proceden de React Query; el reducer no tiene acciones que carguen o fallen el catálogo.

| Acción | Cambio |
|---|---|
| query-changed | Modifica texto de búsqueda |
| repository-toggled | Copia el Set y agrega o elimina un id |
| visible-repositories-toggled | Si todos los ids recibidos estaban elegidos, los elimina; si no, los agrega |
| selection-cleared | Vacía el Set y message; conserva query |

`getVisibleRepositories` aplica trim y lowerCase al texto y filtra por inclusión en nombre o descripción. Es búsqueda local sobre la página ya descargada, no una búsqueda GitHub. No puede encontrar repositorios omitidos por la falta de paginación.

Seleccionar todos afecta solo a los ids visibles; las selecciones fuera del filtro se conservan. `useSelectedRepositories` cruza selectedIds con allRepositories, conservando el orden del catálogo. Si un id seleccionado desaparece del catálogo, no produce un objeto seleccionado, aunque siga en el Set y en el contador visual basado en su tamaño.

## Panel y proyectos

RepositorySelectionContainer combina datos de autenticación, catálogo, filtro, selección y conteos de proyectos. El panel muestra carga, error o lista, además del número de resultados descargados. La selección múltiple se deshabilita cuando carga, hay error o no hay filas visibles.

Nuevo Proyecto se habilita con un Set no vacío; el handler de Project comprueba que exista al menos un objeto de repositorio seleccionado. Limpiar llama al recorrido de Project que borra selección, error y formulario de creación, conservando el filtro de repositorios.

El conteo “en proyectos” se calcula cruzando los resúmenes de repositorios de todos los proyectos cargados. No se obtiene de GitHub ni refleja cantidad de clones locales. [[Project - Uso y frontend]] documenta ese estado y los fallbacks cuando faltan metadatos remotos.

## Del catálogo a un proyecto

1. El usuario selecciona repositorios del catálogo GitHub.
2. El frontend crea un Project.
3. Por cada selección envía projectId y los metadatos remotos a registry de Repository, de manera secuencial.
4. Cuando todos los registros responden success, llama POST /project/init.
5. El backend clona o reutiliza rutas y busca Compose.

Un fallo intermedio deja persistidos los vínculos anteriores. No hay rollback ni desvinculación HTTP para revertirlos. El frontend refresca proyectos en ese caso; consultar [[Project - Repositorios e inicializacion]].

`shortName` toma el último segmento separado por `/`. Los helpers Compose usan ese nombre corto para relacionar directorios clonados, de modo que la pérdida del owner también afecta a la asociación visual de rutas.

Volver a [[Repository - Indice]].

## Fuentes del código

- [apps/web/src/features/repositories/repository.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/repositories/repository.service.ts)
- [apps/web/src/features/repositories/use-repositories.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/repositories/use-repositories.ts)
- [apps/web/src/features/repositories/create-repository.schema.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/repositories/create-repository.schema.ts)
- [apps/web/src/features/repositories/repository.mapper.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/repositories/repository.mapper.ts)
- [apps/web/src/features/repositories/repositories.reducer.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/repositories/repositories.reducer.ts)
- [apps/web/src/features/repositories/repositories.context.tsx](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/repositories/repositories.context.tsx)
- [apps/web/src/features/repositories/use-repository-selectors.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/repositories/use-repository-selectors.ts)
- [apps/web/src/features/repositories/repository-selection.helpers.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/repositories/repository-selection.helpers.ts)
- [apps/web/src/features/repositories/repository-name.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/repositories/repository-name.ts)
- [apps/web/src/pages/views/repository-selection-container.tsx](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/pages/views/repository-selection-container.tsx)
- [apps/web/src/features/repositories/components/repository-selection-panel.tsx](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/repositories/components/repository-selection-panel.tsx)
- [apps/web/src/features/projects/hooks/use-project-creation.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/hooks/use-project-creation.ts)
