---
tags:
  - neoglito
  - project
  - documentacion-tecnica
funcionalidad: Project
actualizado: 2026-10-10
---

# Project · uso y frontend

## Servicio HTTP

| Método projectService | Request |
|---|---|
| getAll() | GET /project |
| create({name, description}) | POST /project/registry |
| update(id, {name, description}) | POST /project/:id/update |
| init({projectId}) | POST /project/init |
| dockerFilesPath({projectId}) | POST /deployment/docker_files |
| environmentVariables({projectId}) | Mismo endpoint y respuesta que dockerFilesPath |

`apiClient` usa VITE_API_URL o localhost:3000, JSON en POST y credentials include. Convierte fallos de red a una respuesta con NETWORK_ERROR. Los hooks comprueban `response.success` y presencia de data. El cliente consume la envoltura del backend, no el proyecto desnudo.

## Datos del servidor y estado visual

`useProjects` mantiene una query con clave `['projects']`. Su queryFn solicita el listado, lanza Error si la respuesta falla y aplica `toProject`, que convierte fechas ISO en Date. Retorna array vacío si no tiene data, flags de carga/error y refresh mediante refetch. No define polling, staleTime, gcTime ni políticas de retry propias; se aplican las opciones de React Query del entorno.

ProjectsProvider contiene un reducer distinto para la navegación y los formularios. No almacena el listado de proyectos en ese reducer ni persiste explícitamente sus campos en localStorage.

| Estado | Uso |
|---|---|
| phase: list/detail/analyze | Pantalla activa |
| openId | Proyecto del modal/resumen |
| activeId | Proyecto del detalle o análisis |
| creating, newName, newDescription | Formulario de creación |
| submitting, progress | Recorrido de creación en curso |
| detailTab | deploy, routes, repos o general |
| editName, editDescription | Valores editados; null usa el valor actual |
| editSubmitting, editSaved, editMessage | Resultado de edición |
| panelError | Error del panel o inicialización |

`project-opened` solo establece openId. `detail-opened` cambia phase a detail, establece activeId, cierra openId y reinicia edición. `creation-succeeded` limpia el formulario y abre detail con el nuevo id. Salir de analyze vuelve a detail y pestaña deploy. Cerrar detalle no envía una parada de contenedores.

## Validación de creación

`useProjectCreationStatus` permite crear si nombre y descripción tienen contenido tras trim, el nombre no está tomado, hay al menos un repositorio seleccionado y no hay envío activo. `isProjectNameTaken` compara nombres recortados en minúsculas sobre los proyectos cargados.

Existe `createProjectSchema` Zod con nombre de 1 a 100 caracteres y descripción de 1 a 500, ambos recortados. `useProjects.createProject` aplica ese esquema antes de llamar al servicio. Sin embargo, el recorrido visible `useProjectCreation.handleCreateProject` llama directamente a `projectService.create`, por lo que no pasa por esa mutación Zod. No debe atribuirse ese límite a todas las rutas del frontend ni al backend.

La mutación genérica tampoco comprueba success ni refresca proyectos por sí misma: retorna el resultado del servicio. El recorrido de creación y edición realizan explícitamente su refresh.

## Progreso de creación

Para N repositorios se usa total N+2: crear Project, registrar N vínculos y buscar Compose. Se muestran etiquetas por paso; no representa porcentaje real de bytes de clonación ni tiempo restante. El último paso de init se marca antes de realizar el request y el progreso desaparece al completar.

Un fallo de vínculos o init llama creation-failed, que desactiva submitting y limpia progress, conservando datos del formulario. Éxito limpia campos, selección de repositorios y abre el detalle, luego refresca el listado.

## Edición

`useProjectEditing` obtiene valores del reducer o del proyecto activo. Bloquea guardar si no hay proyecto, si ambos valores son exactamente iguales a los existentes, si el nombre coincide con otro proyecto o si falta contenido. La comprobación de igualdad ocurre antes del trim del payload: agregar espacios puede habilitar guardar aunque el servidor persista el mismo contenido recortado.

Envía ambos campos al servicio. En error conserva valores y muestra editMessage. En éxito limpia overrides, marca editSaved y refresca proyectos. El hook no comprueba editSubmitting dentro de su condición inicial; el estado se usa para informar a la UI. El servicio no modifica directamente la caché con la respuesta.

## Repositorios y configuración Compose

Los selectores combinan los resúmenes persistidos con la lista GitHub. Para detalle, si falta el repositorio remoto, usan el nombre persistido y etiquetas desconocidas. El conteo de proyectos por repositorio se calcula con el listado de proyectos cargado.

Variables y puertos se guardan en DeploysProvider, usando claves projectId:repositoryId. Los helpers preservan dockerComposePath por fila para seleccionar la configuración del archivo apropiado. Valores literales usan value, interpolaciones usan defaultValue y se consideran requeridas si no tienen default. Estas reglas no ejecutan expansión real de variables Compose.

Volver a [[Project - Indice]].

## Fuentes del código

- [apps/web/src/features/projects/project.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/project.service.ts)
- [apps/web/src/shared/api/client.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/shared/api/client.ts)
- [apps/web/src/features/projects/hooks/use-projects.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/hooks/use-projects.ts)
- [apps/web/src/features/projects/project.mapper.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/project.mapper.ts)
- [apps/web/src/features/projects/projects.reducer.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/projects.reducer.ts)
- [apps/web/src/features/projects/projects.context.tsx](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/projects.context.tsx)
- [apps/web/src/features/projects/create-project.schema.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/create-project.schema.ts)
- [apps/web/src/features/projects/hooks/use-project-selectors.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/hooks/use-project-selectors.ts)
- [apps/web/src/features/projects/hooks/use-project-editing.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/hooks/use-project-editing.ts)
- [apps/web/src/features/repositories/repository-selection.helpers.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/repositories/repository-selection.helpers.ts)
- [apps/web/src/features/projects/compose.helpers.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/compose.helpers.ts)
