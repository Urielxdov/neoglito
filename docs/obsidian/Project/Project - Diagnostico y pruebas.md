---
tags:
  - neoglito
  - project
  - documentacion-tecnica
funcionalidad: Project
actualizado: 2026-10-10
---

# Project · diagnóstico y pruebas

## Diagnóstico por síntoma

| Síntoma | Explicación según código | Qué revisar |
|---|---|---|
| Un usuario ve proyectos creados por otro | El listado no filtra usuario y Project no tiene propietario | GetProjectsUseCase y findAll |
| Se puede crear sin sesión | registry no aplica guard | Decoradores de ProjectController |
| La edición devuelve 201 | POST sin HttpCode, Swagger indica 200 | Contrato HTTP documentado |
| Un nombre vacío devuelve 400 | trim y validación en caso de uso | Campos enviados |
| Un campo numérico devuelve 500 | Tipo runtime no validado antes de trim | DTO, ausencia de ValidationPipe |
| Nombre disponible termina en error al crear | Carrera o índice único de base de datos | Requests concurrentes y error Prisma |
| La UI rechaza una variante de mayúsculas | Comparación lowerCase de nombres cargados | Diferencia con consulta exacta del backend |
| Proyecto sin repositorios tras un fallo | Create y vínculos son requests separados | Qué vínculos llegaron a persistirse |
| Proyecto existente tras fallo de init | No hay rollback de creación | Usar id existente para completar recorrido |
| findById retorna repositories vacío | No usa include; toDomain rellena [] | No confundir proyección con ausencia de vínculos |
| No se encuentran Compose | Patrón de archivos, clones o permisos de GitHub | Documentación de Analisis |
| Las relaciones fallan en un entorno nuevo | Migraciones históricas difieren del modelo actual | Esquema aplicado y cliente generado |
| Cerrar detalle/análisis no apaga servicios | Solo cambia estado del frontend | Operación stop de Deployment |

## Casos ilustrativos

1. **Crear con espacios:** name `"  Tienda  "` y description `"  Catálogo  "` se persisten como Tienda y Catálogo; respuesta 201 sin repositories.
2. **Editar conservando nombre:** buscar el mismo nombre encuentra el mismo id, por lo que la condición de conflicto no se cumple. Se guarda la descripción y se devuelven repositorios incluidos.
3. **Editar un id inexistente con cuerpo válido:** findById lanza 404 y no se intenta save.
4. **Editar un id inexistente con cuerpo vacío:** falla primero la validación; devuelve 400.
5. **API frente a UI:** la API permite un proyecto sin repositorios; la UI exige al menos uno seleccionado para habilitar creación.
6. **Fallo en vínculo intermedio:** tras crear y vincular A, falla B. No se intenta C ni init; el proyecto y A permanecen, se muestra el error y se refresca el listado.
7. **Repetir el formulario anterior:** el nombre ya existe, así que crear de nuevo puede producir 409. No es una reanudación automática.
8. **Sin archivos Compose:** init puede retornar éxito con arrays vacíos; eso no indica que haya contenedores ejecutándose.

Estos casos describen ramas del código; no son resultados de peticiones ejecutadas en el entorno.

## Configuración relacionada

Project no define variables de entorno propias. Depende de Prisma y DATABASE_URL para PostgreSQL; las rutas protegidas dependen de JWT. El cliente usa VITE_API_URL; CORS depende de FRONTEND_URL. La inicialización necesita credenciales GitHub y acceso a archivos según [[Autenticacion - Configuracion y diagnostico]] y [[Analisis - Diagnostico y pruebas]]. El arranque general comprueba Docker aunque una operación de metadatos Project no lo utilice directamente; véase [[Startup - Flujo]].

## Pruebas existentes y límites de verificación

No se encontraron specs dedicados en src/project para CreateProjectUseCase, GetProjectsUseCase, UpdateProjectUseCase, ProjectController o PrismaProjectRepository. Existen pruebas relacionadas de ProjectAnalysisService y de componentes/servicios del recorrido de Deployment en test, incluyendo frontend-deployment-request, frontend-deployment-assigned-ports y frontend-deployment-classification. Cubren piezas relacionadas, no equivalen a comprobar el CRUD de Project ni el recorrido completo create→link→init.

Para futuras pruebas, los comportamientos relevantes son el nombre duplicado, validación runtime, orden de errores, preservación de vínculos al editar, carrera de unicidad, autenticación por ruta y recuperación ante fallos parciales. No se añadieron ni ejecutaron pruebas de aplicación para esta documentación.

La verificación realizada se limita a leer fuentes locales, comprobar enlaces de notas y rutas de fuentes, validar bloques Markdown y comparar los archivos publicados con los generados. No confirma estado real de PostgreSQL, acceso GitHub ni funcionamiento de Docker.

Volver a [[Project - Indice]].

## Fuentes del código

- [src/project/application/use-cases/create-project.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/project/application/use-cases/create-project.use-case.ts)
- [src/project/application/use-cases/update-project.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/project/application/use-cases/update-project.use-case.ts)
- [src/project/infrastructure/persistence/prisma-project.repository.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/project/infrastructure/persistence/prisma-project.repository.ts)
- [apps/web/src/features/projects/hooks/use-project-creation.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/hooks/use-project-creation.ts)
- [src/analisys/application/project-analysis.service.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/application/project-analysis.service.spec.ts)
- [test/frontend-deployment-request.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/test/frontend-deployment-request.spec.ts)
- [test/frontend-deployment-assigned-ports.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/test/frontend-deployment-assigned-ports.spec.ts)
- [test/frontend-deployment-classification.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/test/frontend-deployment-classification.spec.ts)
