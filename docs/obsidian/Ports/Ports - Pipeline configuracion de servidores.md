---
tags:
  - neoglito
  - ports
  - documentacion-tecnica
funcionalidad: ports
actualizado: 2026-10-10
---

# Ports · pipeline: configuración de servidores

## Cuándo se ejecuta

webServerConfigDiscriminator declara resolves FRONTEND/REVERSE_PROXY. Se activa cuando al menos dos candidatos quedan dentro de ese par. Puede trabajar sin publicaciones si la imagen ya acotó el par; no necesita facts.ports.

No es una lectura genérica de todos los servidores: las rutas y directivas están fijadas en el código. La prioridad anterior HTTP puede resolver antes y omitir esta etapa.

## Archivos consultados

| Lectura directa | Directorios cuyos nombres se listan |
| --- | --- |
| /etc/nginx/nginx.conf | /etc/nginx/conf.d |
| /etc/caddy/Caddyfile | /etc/nginx/sites-enabled |
| /usr/local/apache2/conf/httpd.conf | /usr/local/apache2/conf/extra |

readConfigs lista los tres directorios en paralelo, añade sus nombres a las rutas base, deduplica y lee todas las rutas en paralelo. No filtra por extensión ni desciende recursivamente. No interpreta directivas include fuera de esas rutas.

El servicio enlaza ContainerFiles.read con runtime.readFile y list con runtime.listFiles. El runtime usa `docker exec ID cat PATH` y `docker exec ID ls -1 DIRECTORY`, con timeout de 5 segundos por proceso. Un error de exec produce null/[]; faltas de archivo, permisos, utilidades o contenedor inaccesible pueden verse igual.

## Reconocimiento

stripComments elimina desde # hasta fin de línea. Después las regex buscan directivas al inicio de línea o tras `;`/`{`, seguidas por límite de palabra. La búsqueda usa modo multiline y es sensible a mayúsculas/minúsculas.

| Rol respaldado | Directivas reconocidas |
| --- | --- |
| REVERSE_PROXY | proxy_pass, grpc_pass, uwsgi_pass, fastcgi_pass, reverse_proxy, ProxyPass |
| FRONTEND | root, try_files, file_server, DocumentRoot |

findingFromConfigs retiene la primera señal proxy y la primera de estáticos, junto con sus rutas. No necesita analizar todas las directivas para declarar un hallazgo. Si encuentra ambas, devuelve ambos tipos; si no encuentra ninguna, null.

```text
server { location /api { proxy_pass http://api:8000; } }
→ REVERSE_PROXY; evidencia proxy_pass y ruta

server { root /srv; location / { try_files $uri /index.html; } }
→ FRONTEND; evidencia root y ruta

server { root /srv; location /api { proxy_pass http://api:8000; } }
→ FRONTEND y REVERSE_PROXY; permanece ambiguo
```

Las directivas pueden coexistir legítimamente. El modelo final es un único serviceType, por lo que no guarda ambos roles como categorías simultáneas. La ambigüedad termina como UNKNOWN en Prisma.

## Límites

No usa un parser nginx/Caddy/Apache. Eliminar # también puede recortar strings entrecomillados. No valida que las directivas pertenezcan a un bloque activo o que esa configuración haya sido cargada por el proceso. Tampoco demuestra que existan archivos estáticos o que el upstream responda.

Leer el contenido describe el archivo presente en ese momento, no necesariamente la configuración efectiva en memoria. Las lecturas paralelas no constituyen un snapshot. No hay límite propio de bytes para estos cat; el runtime acumula stdout.

Un error de readConfigs es capturado y devuelve null; el wrapper también protege discriminadores. La falta de evidencia mantiene el par anterior y permite otros discriminadores compatibles, si los hay. Los de broker y comando no cubren este par, por lo que normalmente se termina ambiguous.

Volver a [[Ports - Indice]].

## Fuentes del código

- [src/ports/infrastructure/classification/discriminator-webserver.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/discriminator-webserver.ts)
- [src/ports/infrastructure/classification/container-classification.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/container-classification.service.ts)
- [src/container/infrastructure/docker/docker-compose-runtime.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/infrastructure/docker/docker-compose-runtime.service.ts)
- [src/ports/infrastructure/classification/tests/discriminator-webserver.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/tests/discriminator-webserver.spec.ts)
