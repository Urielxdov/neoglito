---
tags:
  - neoglito
  - shared
  - documentacion-tecnica
funcionalidad: Shared
actualizado: 2026-10-10
---

# Shared · diagnóstico, pruebas y extensión

## Diagnóstico

| Síntoma | Explicación del código | Nota relacionada |
|---|---|---|
| No encuentra compose.yaml en análisis | El consumidor activo usa regex docker-compose*.yml | [[Shared - Busqueda de archivos]] |
| Se recorren node_modules o .git | El buscador activo no excluye carpetas | [[Shared - Busqueda de archivos]] |
| Variable compuesta pierde referencias | Solo se captura la primera interpolación con llaves | [[Shared - Extraccion Compose]] |
| Puerto inválido aparece en extracción | Normalizar no equivale a validar/publicar | [[Shared - Extraccion Compose]] |
| TTL fraccionario provoca error | RedisCache exige entero positivo | [[Shared - Redis y cache]] |
| getAll obtiene claves de otra funcionalidad | Caché genérica sin MATCH/namespace | [[Shared - Redis y cache]] |
| Cambiar clave rompe tokens antiguos | No hay rotación ni migración automática | [[Shared - Cifrado y Git]] |
| Error Prisma termina en 500 | El filtro no traduce errores de dominio específicos | [[Shared - HTTP errores y Swagger]] |
| Un objeto con url pierde la envoltura | Heurística estructural del interceptor | [[Shared - HTTP errores y Swagger]] |
| Swagger dice 200 y request responde 201 | El decorador de docs no cambia el status | [[Shared - HTTP errores y Swagger]] |
| NETWORK_ERROR con servidor accesible | El catch también engloba JSON inválido y aborts | [[Shared - Cliente HTTP frontend]] |
| Campo mal tipado pasa el cliente | Solo comprueba presencia de cuatro propiedades | [[Shared - Cliente HTTP frontend]] |
| Hook de estado lanza Provider missing | Consumidor fuera del Provider correspondiente | [[Shared - Estado utilidades y branding]] |
| Etiqueta relativa no cambia sola | No hay timer en formatRelativeTime | [[Shared - Estado utilidades y branding]] |

## Pruebas existentes

RecursiveFileFinderService tiene dos pruebas que crean temporales: búsqueda por ruta relativa y reset de regex stateful. YamlComposeEnviromentVariableExtractService tiene una prueba de mapa/lista, literals, null, default e interpolaciones. No equivalen a validar toda la semántica Docker Compose.

En el área Shared revisada no se encontraron specs dedicados de RedisCache/RedisConnection, cifrado AES, adaptador Git, buscador alternativo, interceptor/filtro, cliente HTTP, fábrica de contextos, tema, fechas o splash. Hay consumidores probados en otros módulos, como ProjectAnalysisService y el preparador Deployment; esa cobertura no sustituye una integración real de Redis, Git o HTTP.

Comandos orientativos para pruebas existentes, **no ejecutados para esta entrega**:

```powershell
npm test -- src/shared/infrastructure/files/recursive-file-finder.service.spec.ts
npm test -- src/shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.spec.ts
```

## Cómo extender según la arquitectura actual

Para una implementación alternativa, mantener el contrato de su puerto y registrar el mismo Symbol en el módulo consumidor. Agregar un archivo bajo shared no basta para que Nest lo pueda inyectar. Elegir useExisting si debe reutilizar una instancia ya registrada, o useClass para el registro de implementación correspondiente.

Al cambiar un contrato HTTP, revisar packages/shared, DTOs y respuestas del backend, Swagger, mappers y servicios frontend. Los tipos duplicados de EnvironmentVariable/ComposePort necesitan revisión conjunta. Mantener nullabilidad y nombres distintos como dockerFilesPath/dockerComposePaths y port number/nullable evita confundir contratos.

Para modificar descubrimiento Compose, cambiar el buscador o patrón que realmente usa ProjectAnalysisService; tocar solo FindDockerFilesUseCase no altera el flujo activo. Para admitir nueva semántica YAML, distinguir extracción de validación/preparación Docker y probar casos que hoy se simplifican.

La documentación describe el comportamiento actual; estas pautas no suponen que se hayan implementado nuevas capacidades o corregido límites.

## Verificación de esta entrega

Se revisaron fuentes y consumidores locales. Se verificaron rutas de fuentes, enlaces Obsidian, bloques Markdown y ejemplos JSON, además de comparar el contenido publicado con el generado. No se modificó código de aplicación ni se ejecutaron pruebas, comandos Git clone, Redis o operaciones Docker.

Volver a [[Shared - Indice]].

## Fuentes del código

- [src/shared/infrastructure/files/recursive-file-finder.service.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/files/recursive-file-finder.service.spec.ts)
- [src/shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.spec.ts)
- [src/analisys/application/project-analysis.service.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/application/project-analysis.service.spec.ts)
- [src/deployment/infrastructure/compose/yaml-deployment-compose.service.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/infrastructure/compose/yaml-deployment-compose.service.spec.ts)
- [package.json](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/package.json)
- [src/analisys/analysis.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/analysis.module.ts)
- [packages/shared/src/repository/responses/project-docker-files.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/repository/responses/project-docker-files.response.ts)
