---
tags:
  - neoglito
  - analisis
  - documentacion-tecnica
funcionalidad: analisis
actualizado: 2026-10-10
---

# Análisis · diagnóstico y pruebas

## Requisitos y configuración

El módulo no declara variables de entorno propias. Necesita una conexión Prisma operativa, un proyecto y sus asociaciones a repositorios. Para proyectos con repositorios, requiere la conexión GitHub del usuario autenticado; para clones nuevos, también descifrado del token, Git ejecutable, acceso a GitHub y permisos de escritura en `repo` bajo el directorio de trabajo.

`DATABASE_URL` configura Prisma; `ENCRYPTION_SECRET_KEY` es la clave de cifrado compartida y `JWT_SECRET` permite validar la sesión de los endpoints. La ubicación de clones se calcula desde `process.cwd()` y no desde un parámetro del endpoint. El arranque general de la aplicación tiene requisitos adicionales, incluidos Docker y Redis; no son operaciones realizadas por el extractor YAML.

## Diagnóstico

| Síntoma | Comprobación |
| --- | --- |
| 401 antes del análisis | Cookie/JWT, expiración y secreto del backend |
| `The project with id N does not exist` | Proyecto y tipo del ID enviado |
| Usuario sin conexión GitHub | Fila `GitHubConnection` para el ID autenticado |
| No se puede ejecutar Git | Ejecutable en PATH del proceso backend |
| Error al clonar | URL, autorización del token, red y directorio destino |
| Resultados antiguos | Clone reutilizado sin pull/fetch |
| Listas de Compose vacías | Asociaciones y patrón `docker-compose*.yml` |
| Falta un archivo `.yaml` o `compose.yml` | Nombre fuera del patrón del módulo |
| 500 de lectura o YAML | Ruta accesible, contenido y sintaxis del archivo |
| Faltan variables de env_file | Esa sección no se inspecciona |
| Un valor compuesto pierde texto | Solo se conserva la primera interpolación reconocida |
| Puertos sin resolver | El análisis conserva expresiones; no evalúa `.env` |
| `/project/init` no devuelve puertos | Extracción deshabilitada y respuesta adaptada |
| Repositorio asociado a ruta equivocada | Colisión de nombres cortos de clones/helper frontend |
| Analizar inicia contenedores | La acción UI llama a deployAndClassify |
| Clasificación fallida con estado succeeded | Se conserva un despliegue exitoso y un mensaje de clasificación |

## Cobertura existente revisada

`project-analysis.service.spec.ts` verifica descubrimiento de nombres admitidos, extracción de variables y puertos, exclusión del extractor de puertos cuando se solicita, listas vacías sin repositorios, proyecto inexistente, propagación de fallos de clonación/extracción y consumidores.

Los casos de consumidores verifican la adaptación de `/project/init` y el rechazo de un Compose ajeno al proyecto antes de ejecutar extractores. Usan mocks: no validan un clone Git real, credenciales, Prisma real o una petición HTTP completa.

`yaml-compose-enviroment-variable-extract.service.spec.ts` crea un archivo temporal y verifica extracción de variables de mapa y lista, literales, default, booleanos y variables sin valor. Eso comprueba lectura y parser del adaptador para ese ejemplo, no todas las reglas de Compose.

Estas pruebas se leyeron como evidencia del comportamiento esperado; **no se ejecutaron durante este trabajo de documentación**. No se modificó el código de la aplicación.

## Comprobación manual sugerida

1. Usar un proyecto de prueba con un repositorio conocido y una sesión válida.
2. Enviar POST `/deployment/docker_files` con su ID y comparar las rutas con los archivos realmente presentes en el backend.
3. Comparar variables y puertos de un Compose simple con [[Analisis - Variables y puertos]].
4. Enviar POST `/project/init` y verificar el cambio de nombre a `dockerComposePaths` y la ausencia de `ports`.
5. Revisar un proyecto sin repositorios y un ID inexistente para distinguir listas vacías de 404.
6. Si se verifica el botón Analizar, hacerlo considerando que crea despliegues; revisar sus estados y detenerlos por el flujo de despliegues cuando termine la comprobación.

Las comprobaciones anteriores son propuestas para un entorno de prueba, no acciones ejecutadas en esta sesión.

## Fuentes del código

- [src/analisys/application/project-analysis.service.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/application/project-analysis.service.spec.ts)
- [src/shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.spec.ts)
- [src/repository/application/use-cases/repository/clone-repository.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/clone-repository.use-case.ts)
- [src/shared/infrastructure/git/git-repository-cloner.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/git/git-repository-cloner.service.ts)
- [src/prisma/prisma.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/prisma/prisma.service.ts)
- [src/auth/infrastructure/passport/jwt.strategy.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/infrastructure/passport/jwt.strategy.ts)
- [src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts)
- [apps/web/src/features/projects/deployment.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/deployment.service.ts)
