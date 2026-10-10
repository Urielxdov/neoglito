---
tags:
  - neoglito
  - shared
  - documentacion-tecnica
funcionalidad: Shared
actualizado: 2026-10-10
---

# Shared · puertos y contratos internos

Los tokens de inyección son Symbols exportados. Un consumidor importa el mismo token y declara `@Inject(TOKEN)`; el tipo de interfaz describe la dependencia para TypeScript. Los contratos no hacen validación runtime por sí mismos.

| Token | Operaciones | Resultado |
|---|---|---|
| CACHE_PORT | get(key), getAll(), set(key,value,ttl?), delete(key), exists(key) | Strings/null, mapa, void o boolean |
| ENCRYPTION_PORT | encrypt(string), decrypt(string) | Promise de string |
| GIT_CLONER_PORT | clone(cloneUrl,username,accessToken,destination) | Promise de ruta string |
| FILE_FINDER_PORT | findFile(directoryPath,RegExp) | Promise de string[] |
| FIND_FILES_PORT | findFiles(rootPath,readonly string[] patterns) | Promise de string[] |
| ENVIROMENT_VARIABLE_EXTRACT_PORT | analyze(filePath) | ComposeAnalysis |
| COMPOSE_PORT_EXTRACT_PORT | analyze(filePath) | ComposePortAnalysis |

Los dos contratos de búsqueda no son intercambiables: uno recibe RegExp contra ruta relativa normalizada; el otro patrones de nombres que su adaptador convierte a regex. [[Shared - Busqueda de archivos]] compara resultados y exclusiones.

## Resultado de variables

ComposeAnalysis contiene environmentVariables. Cada EnvironmentVariable posee service, name, source literal/interpolation, value string o null y defaultValue string o null. En interpolaciones, value expresa el nombre de variable referenciada, no el valor efectivo del entorno.

Los nombres `EnviromentVariableExtractPort`, `ENVIROMENT_VARIABLE_EXTRACT_PORT` y `YamlComposeEnviromentVariableExtractService` conservan el typo del código. Para importar o reemplazar proveedores debe utilizarse la grafía real.

## Resultado de puertos

ComposePortAnalysis contiene ports. Cada ComposePort posee service:string, hostIp:string|null, publishedPort:string|null, targetPort:string, protocol:string y mappingType one-to-one/range.

Los puertos son strings porque pueden contener rangos o expresiones sin resolver. protocol no es una unión tcp/udp en este contrato; puede contener otro texto. publishedPort null expresa ausencia de publicación fija en el dato extraído. Ningún campo demuestra que el puerto esté disponible o responda.

El helper parseComposePort normaliza una entrada y devuelve ComposePort o null; isRecord identifica objetos no nulos y no arrays. Además del extractor, Deployment importa estos helpers al preparar y modificar Compose.

## Errores y capacidades

Las firmas Promise no especifican una jerarquía de errores. Los adaptadores filesystem/YAML pueden propagar errores de lectura o parseo; cifrado usa Error; Git envuelve sus fallos de proceso en InternalServerErrorException; Redis puede propagar errores del cliente y RangeError para TTL inválido.

No hay contratos compartidos para transacciones entre filesystem, Redis y Prisma, cancelación de Git, paginación de getAll o resolución completa de Compose. Esas capacidades no deben inferirse de los nombres de los puertos.

Volver a [[Shared - Indice]].

## Fuentes del código

- [src/shared/application/cache.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/cache.port.ts)
- [src/shared/application/encryption.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/encryption.port.ts)
- [src/shared/application/repository-cloner.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/repository-cloner.port.ts)
- [src/shared/application/file-finder.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/file-finder.port.ts)
- [src/shared/application/find-files.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/find-files.port.ts)
- [src/shared/application/enviroment-variable-extract.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/enviroment-variable-extract.port.ts)
- [src/shared/application/compose-port-extract.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/compose-port-extract.port.ts)
- [src/shared/application/compose-ports.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/compose-ports.ts)
