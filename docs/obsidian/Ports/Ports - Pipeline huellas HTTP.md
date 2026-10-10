---
tags:
  - neoglito
  - ports
  - documentacion-tecnica
funcionalidad: ports
actualizado: 2026-10-10
---

# Ports · pipeline: huellas HTTP

## Cuándo se ejecuta

Es el primer discriminador instalado. Su resolves contiene BACKEND, FRONTEND, REVERSE_PROXY y DATABASE. Solo se llama si quedan al menos dos candidatos y todos pertenecen a ese conjunto.

Además requiere facts.ports con algún PortResult identified/http. No inspecciona los números ctx.ports indiscriminadamente. Si no hay un HTTP identificado, devuelve null sin hacer fetch.

## Adquisición de snapshots

fetchSnapshot solicita `http://host:port/path` mediante fetch, sin método explícito: GET. Usa redirect manual, AbortSignal.timeout(2000) y User-Agent hub-classifier. No sigue un 302 ni solicita HTTPS.

Un snapshot incluye status, Headers y body. readBody lee chunks hasta acumular al menos 64 KiB o llegar al final, cancela el stream y trunca el resultado a 64 KiB antes de decodificar UTF-8. Un chunk puede superar ese umbral en memoria; la salida de texto es la que queda limitada. Fallos de red, timeout o lectura terminan en null.

fingerprintPort crea un Map path → Promise del snapshot. Cada ruta se consulta como máximo una vez para ese puerto y esa invocación, incluso si varias huellas la reutilizan. También cachea null. No hay caché entre clasificaciones o entre puertos.

## Prioridad exacta

Se recorre HTTP_CHECKS en orden y **la primera coincidencia del puerto gana**. No reúne todas las huellas de un mismo snapshot.

| Orden | Huella | Ruta | Señal | Tipos |
| --- | --- | --- | --- | --- |
| 1 | Elasticsearch/OpenSearch | / | Objeto JSON con cluster_name y version | DATABASE |
| 2 | CouchDB | / | Objeto JSON con couchdb | DATABASE |
| 3 | Neo4j | / | Objeto JSON con neo4j_version | DATABASE |
| 4 | InfluxDB | /ping | Header x-influxdb-version presente | DATABASE |
| 5 | Envoy | / | server empieza envoy o x-envoy-upstream-service-time presente | REVERSE_PROXY |
| 6 | Servidor web | / | server empieza nginx/openresty/caddy/apache/lighttpd | REVERSE_PROXY, FRONTEND |
| 7 | Next.js | / | x-powered-by contiene next.js | FRONTEND |
| 8 | Servidor de aplicación | / | Headers reconocidos de servidor/framework | BACKEND |
| 9 | SPA | / | content-type contiene html y marcadores de app | FRONTEND |
| 10 | OpenAPI | /openapi.json | Status 200 y declaración OpenAPI 3 o Swagger 2 | BACKEND |
| 11 | OpenAPI | /api/schema/ | Mismo reconocimiento, incluyendo YAML OpenAPI | BACKEND |
| 12 | OpenAPI | /swagger.json | Mismo reconocimiento | BACKEND |
| 13 | OpenAPI | /v3/api-docs | Mismo reconocimiento | BACKEND |
| 14 | JSON en raíz | / | content-type contiene application/json | BACKEND |

Servidor de aplicación reconoce server con gunicorn, uvicorn, hypercorn, daphne, wsgiserver, werkzeug, waitress, kestrel, jetty, tomcat o puma; o x-powered-by con express, php o asp.net. Las comparaciones de headers pasan a minúsculas.

SPA detecta id root/app, /@vite/client o script type module. No ejecuta JavaScript ni comprueba que exista un frontend funcional. JSON requiere un objeto para las huellas de bases; la huella final solo necesita content-type. Salvo OpenAPI, las reglas no exigen un status HTTP concreto.

## Motivo de la prioridad

Un nginx puede responder al OpenAPI del backend al que hace proxy. El header de servidor web conserva FRONTEND/REVERSE_PROXY antes de examinar OpenAPI; la configuración puede desambiguar después. Un servidor de aplicación que renderiza HTML gana antes que una marca SPA.

Las reglas son heurísticas y los headers/cuerpos pueden inducir resultados incorrectos. Una respuesta de error JSON puede respaldar BACKEND; un header de proxy puede pertenecer a otra capa. El orden expresa la decisión del código, no una demostración universal del rol.

## Varios puertos

El discriminador llama fingerprintPort en paralelo para los HTTP identificados. Cada puerto aporta su primera huella. Reúne la unión de tipos de las huellas y evidencia `puerto → nombre`. Luego el runner intersecta con candidatos actuales.

Ejemplo: un puerto responde nginx y otro gunicorn → Finding respalda REVERSE_PROXY, FRONTEND y BACKEND. Puede seguir ambiguo; no se clasifica solo por el primero ni se fuerza un tipo único.

Como máximo hay seis rutas distintas: /, /ping, /openapi.json, /api/schema/, /swagger.json y /v3/api-docs. Se piden conforme se recorren checks y se detiene al coincidir. Si cada ruta tarda, el tiempo por puerto puede acumular varios timeouts de 2 segundos; no hay deadline global.

## Continuación y fallos

Si no hay coincidencias, devuelve null y otros discriminadores aplicables pueden intentar resolver. Si HTTP devuelve una categoría única compatible, se termina la cadena y no se leen configs. Una huella web puede reducir cuatro tipos a dos y habilitar config web. El wrapper de discriminación trata cualquier excepción como null.

Ver [[Ports - Pipeline configuracion de servidores]] para el desempate FRONTEND/REVERSE_PROXY.

Volver a [[Ports - Indice]].

## Fuentes del código

- [src/ports/infrastructure/classification/discriminator-http.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/discriminator-http.ts)
- [src/ports/infrastructure/classification/discrimination.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/discrimination.ts)
- [src/ports/infrastructure/classification/tests/discriminator-http.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/tests/discriminator-http.spec.ts)
