---
tags:
  - neoglito
  - ports
  - documentacion-tecnica
funcionalidad: ports
actualizado: 2026-10-10
---

# Ports · diagnóstico, pruebas y extensión

## Configuración y tiempos

| Configuración | Default y uso |
| --- | --- |
| REDIS_URL | redis://localhost:6379; RedisConnection |
| CONTAINER_PROBE_HOST | 127.0.0.1; sondas y huellas HTTP |
| DRAFT_PORT_TTL_SECONDS | Constante 300 s; no variable env |
| holdPort timeoutMs | 30 000 ms si se omite; timer local |
| Debounce formulario | 600 ms |
| Consulta frontend de reservas | stale/refetch 30 s; gc 5 min |
| Conexión TCP | 1000 ms antes de connect |
| Espera de banner | 300 ms después de connect |
| Respuesta de sonda | 1000 ms después de connect |
| Snapshot HTTP | 2000 ms por fetch; texto limitado a 64 KiB |
| Exec de config | 5000 ms por comando en Container runtime |

TcpContainerProbeService captura su default host al construir la instancia. ContainerClassificationService lo lee al armar contextos en classify y lo pasa explícitamente a probe. Para uso habitual ambos leen el mismo env al arrancar. No hay host distinto por contenedor ni un timeout global del pipeline.

El Compose de Neoglito usa CONTAINER_PROBE_HOST con fallback host.docker.internal y extra_hosts host-gateway. Una API dentro de Docker con host 127.0.0.1 consultaría su propio contenedor, que puede no exponer los puertos publicados en el host del daemon.

## Diagnóstico de clasificación

1. Verificar la fase que falló: precondiciones Docker, adquisición de evidencia, clasificación o persistencia.
2. Revisar el ID y composePath guardados; contrastar que list observe los mismos IDs y status running.
3. Revisar ContainerInspection: imagen normalizada, publicados TCP, aliases, Entrypoint+Cmd y env necesarios.
4. Reproducir candidatos antes/después de cada handler; identificar si hubo resolved/conflict temprano.
5. Verificar qué discriminadores eran elegibles y qué facts recibieron.
6. Interpretar por separado Classification y serviceType guardado. UNKNOWN pierde información del resultado interno.

| Síntoma | Explicación a comprobar |
| --- | --- |
| 409 antes de clasificar | Sin servicios, ID recreado/ausente, no running o fallo list/inspect |
| HTTP 201 pero UNKNOWN | Resultado interno ambiguo, conflict, unknown o herramienta UNKNOWN |
| Una imagen conocida no genera tráfico de sonda | imageHandler resuelve y cortocircuita |
| Redis inaccesible da UNKNOWN pese a consumidores | no_listeners produjo conflict antes de uso |
| Redis accesible sigue ambiguo | Variables genéricas, aliases diferentes o cache y broker simultáneos |
| Worker sin publicaciones queda UNKNOWN | Comando no catalogado o varios roles simultáneos |
| App HTTP sigue ambiguo | No coincide huella; config no cubre el conjunto completo restante |
| Web no llega a OpenAPI | Una huella anterior ganó para ese puerto |
| Config web no se lee | Resolución temprana o candidatos fuera de FRONTEND/REVERSE_PROXY |
| Un candidato no entra en ningún desempate | current no es subconjunto de ningún resolves pendiente |
| Servicio TLS no identificado | Sondas trabajan TCP sin negociar TLS/HTTPS |
| Protocolo conocido no reconocido | Fragmentación, timeout o firma incompleta/incompatible |
| Resultado tarda | Puertos/sondas/rutas secuenciales por puerto, sin deadline global |

ClassifyDeploymentServicesUseCase registra resultados no resueltos con debug: kind y evidence. No hace ese log para resolved, incluido resolved UNKNOWN. Candidatos no se registran explícitamente en ese mensaje. Config/read/fetch y wrappers pueden ocultar errores como null; no hay una traza detallada incorporada para todas las etapas.

## Diagnóstico de reservas

| Síntoma | Explicación a comprobar |
| --- | --- |
| GET no muestra reservas pero POST da 409 | Proceso externo ocupa socket, datos cambiaron o solo existe la clave inversa |
| Segundo POST del mismo proyecto/puerto da 409 | reservePort rechaza claves existentes antes del script |
| Draft desaparece | TTL 300 s, liberación del formulario o transferencia al deployment |
| Hold permanece en Redis después de caída | Sin TTL Redis; timer era local al proceso |
| restorePort false | Puerto/owner inválido, par parcial o conflicto de claves |
| releasePort false con owner visible | Clave inversa ausente o apuntando a otro owner |
| Puerto de Docker y reserva no coinciden | Red/env del API distinto, modelo de un puerto, cambio externo o classify sin sincronizar Redis |
| Dos formularios interfieren | Owner draft compartido por projectId/port |

Las comprobaciones Redis de getAll no reemplazan inspeccionar ambas claves y TTL cuando se investiga un par incoherente. Evitar asumir que borrar datos de ORM libera la reserva: no hay ese hook.

## Mapa de implementación

| Decisión o I/O | Archivo |
| --- | --- |
| Endpoints y validación | presentation/port.controller.ts |
| TTL y owner draft | application/draft-port-owner.ts |
| Scripts, sockets y holds | infrastructure/reservations/redis-port-reservation.service.ts |
| Orden/host de sondas | infrastructure/probing/tcp-container-probe.service.ts |
| Transporte y agregación | infrastructure/probing/port-identification.ts |
| Payloads y firmas | infrastructure/probing/protocol-probes.ts |
| Composición del pipeline | infrastructure/classification/container-classification.service.ts |
| Candidatos y terminales | infrastructure/classification/classification.ts |
| Elegibilidad de desempates | infrastructure/classification/discrimination.ts |
| Catálogo de imagen/protocolo | src/deployment/domain/services |
| Precondiciones y ORM | src/deployment/application/use-cases/classify-deployment-services.use-case.ts |

Las rutas sin prefijo de esta tabla son relativas a src/ports.

## Pruebas existentes

| Prueba | Qué verifica |
| --- | --- |
| discrimination.spec.ts | Subconjunto resolves, orden, una ejecución por discriminador, null/excepciones y conflicto con evidencia |
| discriminator-http.spec.ts | Huellas positivas/negativas, prioridad web/aplicación, caché por ruta y unión de puertos |
| discriminator-webserver.spec.ts | Proxy/estáticos, coexistencia, comentarios, Caddy/Apache, línea única y errores de lectura |
| discriminator-broker.spec.ts | Roles por key, aliases, varias URLs, uso propio ignorado y ambigüedad |
| discriminator-command.spec.ts | Workers/schedulers y flags embebidos, casos negativos y límites de patrones |
| discrimination.integration.spec.ts | Cadena completa con servidores HTTP/TCP locales reales y archivos Docker simulados |
| classify-deployment-services.use-case.spec.ts | Precondiciones, inspect, clasificación, actualización ORM y rechazos antes de escribir |
| deploy-compose.use-case.spec.ts | Coordinación de holds/transferencias mediante mocks |
| frontend-deploy-port-field.spec.ts | Campos asignados/deshabilitados y llamada al hook simulado |
| frontend-deployment-assigned-ports.spec.ts | Asignación por archivo/servicio y restricciones de mappings |

Las pruebas de integración del clasificador sí abren servidores locales en su implementación; no son despliegues Docker y no validan Redis real. La prueba del campo frontend simula usePortReservation, por lo que no demuestra su debounce, renovación o cleanup real.

En el árbol revisado no se encontraron spec dedicados a RedisPortReservationService ni a todas las firmas binarias/temporización de identifyPort. La cobertura de esos bordes no debe inferirse de los mocks de deployment. Todas las pruebas citadas se revisaron como evidencia y **no se ejecutaron durante la documentación**.

Con el script test de package.json, una ejecución selectiva posible es:

```powershell
npm test -- src/ports/infrastructure/classification/tests
npm test -- src/deployment/application/use-cases/classify-deployment-services.use-case.spec.ts
```

Estos comandos son instrucciones de uso, no un registro de ejecución. El primer grupo puede abrir sockets locales por sus pruebas de integración.

## Cómo extender el pipeline

Para agregar una imagen, actualizar SERVICE_IMAGE_CATALOG con la referencia normalizada y sus candidatos; comprobar duplicados y efectos de resolución temprana. Una regla única omitirá el contraste por protocolo/configuración que quizá se quería preservar.

Para agregar un protocolo, declarar Protocol, implementar ServerFirstProbe o ClientFirstProbe en PROBES, asignar categorías en PROTOCOL_SERVICE_TYPES y agregarlo al orden de TcpContainerProbeService. Los Record tipados obligan a mantener catálogo y mapa, pero no agregan automáticamente el protocolo al orden de ejecución.

Para agregar una huella HTTP, añadir HttpCheck con ruta, match y tipos, revisar su posición y casos en que un proxy sirve contenido ajeno. El primer match gana; mover una regla puede cambiar resultados sin tocar narrowTo.

Para un discriminador nuevo, definir resolves como su dominio real, devolver Finding o null y registrarlo en ContainerClassificationService. Si nunca puede haber current ⊆ resolves, será inalcanzable. Si resuelve antes que otro, ese otro no contrastará la evidencia. Para decidir nuevos roles, actualizar ServiceType, Prisma y contratos/consumidores que dependan de ellos.

Las verificaciones útiles cubren evidencia positiva, ausencia, incompatibilidad, roles simultáneos, excepciones, elegibilidad y cortocircuito. Para una sonda incluir respuestas fragmentadas/incompletas, autenticación requerida y timeouts. Para reservas, estudiar par parcial, TTL, múltiples owners y fallos entre bind/Redis/handoff; actualmente no existe una transacción que los elimine.

La extensión debe distinguir el resultado interno que se quiere explicar de la persistencia actual, que solo guarda un tipo. Añadir evidencia estructurada a un endpoint o a Prisma requeriría un cambio de aplicación; estas notas no introducen ese comportamiento.

Volver a [[Ports - Indice]].

## Fuentes del código

- [docker-compose.yml](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/docker-compose.yml)
- [package.json](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/package.json)
- [vitest.config.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/vitest.config.ts)
- [src/ports/infrastructure/classification/container-classification.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/container-classification.service.ts)
- [src/ports/infrastructure/classification/tests/discrimination.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/tests/discrimination.spec.ts)
- [src/ports/infrastructure/classification/tests/discriminator-http.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/tests/discriminator-http.spec.ts)
- [src/ports/infrastructure/classification/tests/discriminator-webserver.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/tests/discriminator-webserver.spec.ts)
- [src/ports/infrastructure/classification/tests/discriminator-broker.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/tests/discriminator-broker.spec.ts)
- [src/ports/infrastructure/classification/tests/discriminator-command.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/tests/discriminator-command.spec.ts)
- [src/ports/infrastructure/classification/tests/discrimination.integration.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/tests/discrimination.integration.spec.ts)
- [src/deployment/application/use-cases/classify-deployment-services.use-case.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/classify-deployment-services.use-case.spec.ts)
- [test/frontend-deploy-port-field.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/test/frontend-deploy-port-field.spec.ts)
- [test/frontend-deployment-assigned-ports.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/test/frontend-deployment-assigned-ports.spec.ts)
