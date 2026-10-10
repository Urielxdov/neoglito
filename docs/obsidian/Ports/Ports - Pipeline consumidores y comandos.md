---
tags:
  - neoglito
  - ports
  - documentacion-tecnica
funcionalidad: ports
actualizado: 2026-10-10
---

# Ports · pipeline: consumidores y comandos

## Uso como cache o broker

brokerUsageDiscriminator declara resolves CACHE/MESSAGE_BROKER. Captura todos los ContainerContext del conjunto inspeccionado. Para el contexto objetivo crea un Set de aliases en minúsculas y revisa env de **los otros contenedores**, omitiendo su propio id.

Primero interpreta el nombre de la variable, convertido a mayúsculas:

| Señal en key | Tipo respaldado |
| --- | --- |
| BROKER, QUEUE, BULL, DRAMATIQ, HUEY o RQ delimitado por inicio/fin/underscore | MESSAGE_BROKER |
| CACHE | CACHE |
| REDIS_URL o CELERY_RESULT_BACKEND sin otras señales | Ninguno |

Si una key coincide con broker y cache, gana broker porque se evalúa primero. BROKER/CACHE y otros patrones se buscan como substrings; RQ tiene delimitadores específicos para evitar ARQUITECTURA.

Solo cuenta el valor si contiene alguna URL redis://, rediss://, valkey:// o valkeys:// cuyo hostname normalizado pertenezca a los aliases del objetivo. Puede reconocer varias URLs en un mismo string y credenciales. No exige coincidencia de puerto, base Redis o contraseña ni resuelve DNS.

```text
Objetivo: id redis-id, aliases [redis], candidatos CACHE/MESSAGE_BROKER
Otro contenedor: aliases [worker], CELERY_BROKER_URL=redis://redis:6379/0
→ Finding MESSAGE_BROKER; evidencia worker.CELERY_BROKER_URL
```

Si un consumidor usa CACHE_URL y otro CELERY_BROKER_URL hacia el mismo objetivo, reúne ambos tipos y permanece ambiguo. Sin referencias significativas devuelve null. Un genérico REDIS_URL no basta para inferir rol. Un broker fuera de ese conjunto/alias no aporta evidencia.

No analiza código de clientes, conexiones reales ni tráfico de trabajo; interpreta el nombre y el valor de env. El contexto completo es importante: clasificar Redis aislado puede dar ambiguous, y clasificarlo junto a sus consumidores puede resolver broker. Una variable configurada pero no utilizada por el proceso también cuenta.

La evidencia registra alias/id del consumidor y nombre de variable, no su valor. Los env completos siguen disponibles internamente desde inspect.

## Comando de worker o scheduler

commandDiscriminator declara resolves WORKER/SCHEDULER. Une Entrypoint+Cmd con espacios y llama findingFromCommand; no ejecuta el comando ni analiza el árbol de procesos.

| WORKER | SCHEDULER |
| --- | --- |
| celery … worker | celery … beat |
| rqworker o rq … worker | celery worker con -B, flags cortos que contienen B o --beat |
| dramatiq | ofelia |
| arq | supercronic |
| huey_consumer | cron o crond como comando/palabra delimitada |
| qcluster (django-q) | rqscheduler |
| sidekiq | airflow … scheduler |

Busca todos los patrones, no elige el primero. Un celery worker -B coincide con worker y scheduler y devuelve ambos. La regex de beat evita confundir beat_app; la de cron evita crontab/cron_app. Las regex son sensibles a mayúsculas/minúsculas. Las formas shell pueden coincidir por el texto unido sin analizar su semántica.

Gunicorn, node server.js, crontab -l y celery inspect ping no aportan por sí mismos estas categorías. Si no reconoce ninguna, devuelve null. Un worker con un comando no catalogado puede quedar ambiguous si se había acotado por no_listeners, o unknown si no hubo publicaciones ni señal de tarea.

## Cómo llega al discriminador de comando

Sin puertos, protocolo llama previamente findingFromCommand; si hay una señal, limita a WORKER/SCHEDULER y habilita este desempate. Con puertos observados todos closed también acota al par, aunque la señal de tarea no exista.

Si la imagen ya resolvió DATABASE, no se examina el comando. Si la imagen dejó CACHE/BROKER, una señal worker sin publicaciones produce una intersección vacía en el handler de protocolo y termina conflict antes del desempate. No se agregan WORKER/SCHEDULER a candidatos incompatibles.

## Orden del pipeline

Uso y comando son los últimos discriminadores registrados, pero solo se ejecutan sobre su par correspondiente. No son un fallback universal para cualquier ambigüedad. Todos los candidatos actuales deben estar en resolves.

Volver a [[Ports - Indice]].

## Fuentes del código

- [src/ports/infrastructure/classification/discriminator-broker.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/discriminator-broker.ts)
- [src/ports/infrastructure/classification/discriminator-command.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/discriminator-command.ts)
- [src/ports/infrastructure/classification/handler-protocol.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/handler-protocol.ts)
- [src/ports/infrastructure/classification/container-classification.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/container-classification.service.ts)
