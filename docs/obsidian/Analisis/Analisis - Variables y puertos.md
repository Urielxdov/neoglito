---
tags:
  - neoglito
  - analisis
  - documentacion-tecnica
funcionalidad: analisis
actualizado: 2026-10-10
---

# Análisis · variables y puertos

Ambos extractores leen UTF-8 y utilizan `yaml.parse` con `{ merge: true }`, que permite procesar merges YAML. No ejecutan `docker compose config`, no cargan `.env` ni resuelven expresiones contra el entorno real del proceso.

## Variables

Se inspecciona únicamente `services.<servicio>.environment`, en sintaxis de mapa o lista. Si el documento no contiene un objeto `services`, devuelve una lista vacía. Omite definiciones de servicio incompatibles y entradas de lista que no sean strings.

| Campo | Significado |
| --- | --- |
| `service` | Nombre de la clave del servicio |
| `name` | Nombre de la variable declarada para el contenedor |
| `source` | `literal` o `interpolation` |
| `value` | Literal serializado o nombre de variable referenciada |
| `defaultValue` | Valor por defecto detectado o `null` |

Ejemplos para el servicio `api`:

| Declaración | `name` | `source` | `value` | `defaultValue` |
| --- | --- | --- | --- | --- |
| `NODE_ENV: production` | `NODE_ENV` | literal | `production` | null |
| `PORT: ${HTTP_PORT:-3000}` | `PORT` | interpolation | `HTTP_PORT` | `3000` |
| `PORT: ${HTTP_PORT-3000}` | `PORT` | interpolation | `HTTP_PORT` | `3000` |
| `TOKEN: ${TOKEN:?mensaje}` | `TOKEN` | interpolation | `TOKEN` | null |
| `TOKEN: $TOKEN` | `TOKEN` | interpolation | `TOKEN` | null |
| `FLAG: true` | `FLAG` | literal | `true` como string | null |
| `OPTIONAL:` | `OPTIONAL` | interpolation | `OPTIONAL` | null |
| Lista `- OPTIONAL` | `OPTIONAL` | interpolation | `OPTIONAL` | null |
| Lista `- VALUE=a=b` | `VALUE` | literal | `a=b` | null |

Una entrada de lista se separa por el primer `=`. Valores de mapa string, number y boolean se convierten a string; null/undefined y estructuras no escalares se convierten a null y acaban representados como interpolación del nombre de la variable.

La expresión con llaves admite `${VAR}`, `${VAR:-default}`, `${VAR-default}`, `${VAR:?error}` y `${VAR?error}`. Solo `:-` y `-` generan `defaultValue`. No conserva el operador ni el mensaje de error y no distingue su semántica ante strings vacíos.

La regex con llaves busca la primera coincidencia dentro del valor: `URL: https://${HOST}/api` se representa como `value: HOST`, perdiendo el texto alrededor. Un valor con varias interpolaciones conserva una sola coincidencia. La variante `$VAR` exige que ocupe todo el valor. No hay evaluación de expresiones anidadas, operadores alternativos o escapes de dólares conforme al motor completo de Compose.

No se inspeccionan `env_file`, `.env`, build args, imágenes, comandos, dependencias ni interpolaciones de otras secciones. No se eliminan duplicados.

## Puertos

Se inspecciona `services.<servicio>.ports` cuando es un arreglo. `parseComposePort` normaliza sintaxis corta y larga sin resolver interpolaciones.

| Campo | Significado |
| --- | --- |
| `service` | Nombre del servicio |
| `hostIp` | Dirección declarada del host o null |
| `publishedPort` | Puerto publicado como string o null |
| `targetPort` | Puerto del contenedor como string |
| `protocol` | Protocolo declarado; `tcp` por defecto |
| `mappingType` | `range` si un puerto coincide con dígitos-dígitos; si no, `one-to-one` |

| Declaración | `hostIp` | `publishedPort` | `targetPort` | `protocol` | Tipo |
| --- | --- | --- | --- | --- | --- |
| `"8080:3000"` | null | `8080` | `3000` | tcp | one-to-one |
| `"127.0.0.1:8080:3000"` | `127.0.0.1` | `8080` | `3000` | tcp | one-to-one |
| `"53:53/udp"` | null | `53` | `53` | udp | one-to-one |
| `3000` | null | null | `3000` | tcp | one-to-one |
| `"8000-8002:3000-3002"` | null | `8000-8002` | `3000-3002` | tcp | range |

La sintaxis larga admite `target` string/number y `published` string/number/null. Lee `host_ip` y `protocol` si son strings. Ignora otros atributos como `mode`, `name` y `app_protocol`.

Entradas no compatibles o sin target no vacío se omiten. No comprueba que el puerto sea numérico, esté en 1..65535, esté libre o tenga un protocolo soportado por el despliegue. Un string `${HOST_PORT}:3000` conserva `${HOST_PORT}` como `publishedPort`. No expande rangos ni inspecciona `expose`.

## Ejemplo combinado

```yaml
services:
  api:
    image: ejemplo/api
    environment:
      NODE_ENV: production
      PORT: ${PORT:-3000}
    ports:
      - "8080:3000"
```

Produce dos variables para `api` y un puerto `publishedPort: "8080"`, `targetPort: "3000"`. El archivo no se modifica, el puerto no se reserva y `PORT` no se sustituye en el YAML durante esta extracción. El ejemplo de respuesta HTTP aparece en [[Analisis - Endpoints]].

## Fuentes del código

- [src/shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.ts)
- [src/shared/infrastructure/compose/yaml-compose-port-extract.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/compose/yaml-compose-port-extract.service.ts)
- [src/shared/application/compose-ports.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/compose-ports.ts)
- [src/shared/application/enviroment-variable-extract.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/enviroment-variable-extract.port.ts)
- [src/shared/application/compose-port-extract.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/compose-port-extract.port.ts)
