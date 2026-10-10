---
tags:
  - neoglito
  - ports
  - documentacion-tecnica
funcionalidad: ports
actualizado: 2026-10-10
---

# Ports · pipeline: ejemplos paso a paso

Los recorridos siguientes aplican las reglas actuales a contextos ilustrativos. Todos comienzan con ocho candidatos. No son resultados de ejecuciones realizadas durante la documentación. En los casos de red se supone la respuesta indicada.

## 1. PostgreSQL sin puerto publicado

Entrada: image postgres:16, ports [], command []. Imagen normalizada postgres → regla DATABASE → narrowTo deja uno → resolved DATABASE. No se ejecutan protocolo ni discriminadores.

Se guarda DATABASE. La ausencia de publicación no impide identificar por imagen; tampoco se ha demostrado que el proceso PostgreSQL esté disponible.

## 2. Herramienta pgAdmin con puerto HTTP

Entrada: image dpage/pgadmin4, ports [8080]. El catálogo devuelve exclusivamente UNKNOWN y imageHandler usa una resolución especial. No consulta HTTP.

Resultado interno resolved UNKNOWN, guardado UNKNOWN. Se distingue internamente de unknown por falta de evidencia, aunque el endpoint exponga el mismo serviceType.

## 3. Imagen propia, HTTP y Gunicorn

Entrada: image miorg/api:1, ports [8000]. Imagen fuera del catálogo → pass. TCP conecta, sin banner, y tras intentos previos HTTP reconoce la respuesta → protocolos [http]. Protocolo acota a BACKEND/FRONTEND/DATABASE/REVERSE_PROXY.

HTTP aplicable; GET / devuelve server gunicorn. La huella de servidor de aplicación respalda BACKEND → resolved BACKEND. Config/uso/comando no se ejecutan. Se guarda BACKEND.

## 4. Nginx que hace proxy a un backend con OpenAPI

Entrada: image nginx:alpine, ports [8080]. Imagen deja FRONTEND/REVERSE_PROXY. HTTP TCP reconocido mantiene ambos. GET / con server nginx encuentra primero la huella servidor web, que mantiene el par.

HTTP no llega a elegir OpenAPI aunque el upstream lo publique. Config web se vuelve el siguiente aplicable; lee un proxy_pass activo sin señales de estáticos → REVERSE_PROXY. Se guarda REVERSE_PROXY.

Si hubiera root y proxy_pass activos, config respaldaría ambos y el resultado seguiría ambiguous. Una directiva estática de la configuración efectiva puede mantener esa ambigüedad aunque el servicio haga proxy en parte.

## 5. Redis como broker de Celery

Entrada objetivo: redis:7, aliases [redis], ports [16379]. Otro contexto tiene aliases [worker] y CELERY_BROKER_URL=redis://redis:6379/0.

Imagen deja CACHE/MESSAGE_BROKER. TCP reconoce RESP → mantiene el par. HTTP/config no cubren ese par y se omiten. Uso detecta key BROKER y hostname redis igual al alias → Finding MESSAGE_BROKER → resolved. Se guarda MESSAGE_BROKER.

La referencia usa puerto interno 6379 y el probe publicado 16379; uso compara hostname, no puerto. También puede resolver sin ports si no aparece un comando de tarea incompatible: protocolo hace pass y uso sigue aplicable.

## 6. Redis utilizado como cache y broker

Misma imagen y RESP, pero otro contenedor tiene CACHE_URL y CELERY_BROKER_URL dirigidos a redis. Uso respalda ambas categorías. narrowTo conserva ambas y registra evidencia. Comando no es aplicable para ese par.

Resultado ambiguous con CACHE/MESSAGE_BROKER. Se guarda UNKNOWN; no se almacena una lista de los dos roles. Redis sin consumidores significativos también queda ambiguous, aunque con menos evidencia.

## 7. Redis inaccesible desde el host del probe

Imagen deja CACHE/MESSAGE_BROKER. Todos los intentos iniciales de conexión a sus publicados fallan → no_listeners. Protocolo respalda WORKER/SCHEDULER. Intersección vacía con el par de Redis → conflict.

La cadena termina antes de revisar consumidores, incluso si sus variables apuntan a redis. Se guarda UNKNOWN. El endpoint puede responder éxito si las precondiciones Docker y la escritura se cumplieron. Este conflict no es el 409 por un contenedor Docker no running.

## 8. Celery worker sin publicaciones

Entrada: image miorg/jobs:1, ports [], command [celery,-A,billing,worker]. Imagen pass. Protocolo reconoce señal de tarea y acota a WORKER/SCHEDULER sin sondear.

Comando es el primer discriminador aplicable en ese par. findingFromCommand solo respalda WORKER → resolved. Se guarda WORKER. No se requiere una conexión TCP.

## 9. Celery worker con scheduler embebido

Mismo caso con command [celery,-A,billing,worker,-B]. Protocolo deja el par. Comando coincide tanto con worker como con scheduler → Finding de ambos → el par no se reduce.

Resultado ambiguous y guardado UNKNOWN. El código evita escoger un solo rol cuando el comando declara ambos. La información del segundo rol no se conserva en Prisma.

## 10. App sin publicaciones y comando no catalogado

Entrada: miorg/api:1, ports [], command [node,server.js]. Imagen pass y protocolo pass. Los ocho candidatos permanecen.

Ningún resolves de los discriminadores incluye todos los ocho; no se hace HTTP, no se leen configs y no se aplica comando como fallback. Final unknown → guarda UNKNOWN. La palabra node no decide BACKEND.

## 11. HTTP reconocido sin huella conocida

Imagen propia, puerto que responde HTTP, cuerpo text/plain ok y sin headers reconocidos. Protocolo deja cuatro categorías HTTP. fingerprintPort recorre rutas sin coincidencias y devuelve null.

Config no cubre ese conjunto de cuatro, uso tampoco y comando tampoco. Resultado ambiguous BACKEND/FRONTEND/DATABASE/REVERSE_PROXY, guardado UNKNOWN.

## 12. Dos protocolos en un contenedor

Imagen propia, un puerto reconocido postgres y otro resp. El handler reúne unión DATABASE/CACHE/MESSAGE_BROKER y la intersecta con los ocho.

HTTP, config, uso y comando no cubren **todos los tres** candidatos. No se permite al discriminador de consumidores elegir broker mientras DATABASE siga compitiendo. Resultado ambiguous, guardado UNKNOWN. Un hallazgo más amplio no garantiza más resolución.

## Cómo inspeccionar una traza

Registrar conceptualmente: entrada → candidatos antes → etapa elegible → evidencia → intersección → salida → etapas omitidas → valor ORM. Ver [[Ports - Pipeline candidatos y veredictos]] para las reglas y [[Ports - Diagnostico pruebas y extension]] para fuentes y pruebas.

Volver a [[Ports - Indice]].

## Fuentes del código

- [src/ports/infrastructure/classification/tests/discrimination.integration.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/tests/discrimination.integration.spec.ts)
- [src/ports/infrastructure/classification/classification.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/classification.ts)
- [src/ports/infrastructure/classification/handler-image.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/handler-image.ts)
- [src/ports/infrastructure/classification/handler-protocol.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/handler-protocol.ts)
- [src/deployment/application/use-cases/classify-deployment-services.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/classify-deployment-services.use-case.ts)
