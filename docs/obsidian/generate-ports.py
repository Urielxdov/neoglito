from pathlib import Path
import re

base = Path(__file__).resolve().parent
repo = base.parent.parent
out = base / 'Ports'
out.mkdir(exist_ok=True)
notes = {}

notes.update({
'Ports - Diagnostico pruebas y extension': ('''# Ports · diagnóstico, pruebas y extensión

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
''', ['docker-compose.yml', 'package.json', 'vitest.config.ts', 'src/ports/infrastructure/classification/container-classification.service.ts', 'src/ports/infrastructure/classification/tests/discrimination.spec.ts', 'src/ports/infrastructure/classification/tests/discriminator-http.spec.ts', 'src/ports/infrastructure/classification/tests/discriminator-webserver.spec.ts', 'src/ports/infrastructure/classification/tests/discriminator-broker.spec.ts', 'src/ports/infrastructure/classification/tests/discriminator-command.spec.ts', 'src/ports/infrastructure/classification/tests/discrimination.integration.spec.ts', 'src/deployment/application/use-cases/classify-deployment-services.use-case.spec.ts', 'test/frontend-deploy-port-field.spec.ts', 'test/frontend-deployment-assigned-ports.spec.ts']),
})

notes.update({
'Ports - Pipeline ejemplos paso a paso': ('''# Ports · pipeline: ejemplos paso a paso

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
''', ['src/ports/infrastructure/classification/tests/discrimination.integration.spec.ts', 'src/ports/infrastructure/classification/classification.ts', 'src/ports/infrastructure/classification/handler-image.ts', 'src/ports/infrastructure/classification/handler-protocol.ts', 'src/deployment/application/use-cases/classify-deployment-services.use-case.ts']),

'Ports - Endpoints': ('''# Ports · endpoints

## Rutas de reserva

| Método y ruta | Autenticación | Parámetros | Éxito esperado |
| --- | --- | --- | --- |
| GET /port | Sin JwtAuthGuard | Ninguno | 200 con mapa de reservas |
| POST /port | JwtAuthGuard, cookie o Bearer | Body projectId number, port number | 201 con port y ownerId |
| DELETE /port/:projectId/:port | JwtAuthGuard | Ambos con ParseIntPipe | 200 con released boolean |

PortController no tiene guard de clase; solo POST/DELETE lo declaran. main/AppModule tampoco registran un guard global en el código revisado. GET es público y lista owners de todo ese espacio Redis, no solo de un usuario.

El DTO de POST solo aporta Swagger. La validación ejecutada exige port entero 1..65535 y projectId entero. No exige projectId positivo, no busca el proyecto en Prisma ni verifica propiedad. No acepta port como string JSON y no acepta rangos; para ello retorna 400.

DELETE valida el rango de port tras convertir ambos parámetros. projectId usa ParseIntPipe; no agrega comprobación de existencia/propiedad. Solo construye owner draft. Repetir la liberación puede devolver released false con 200.

## Reservar

```http
POST /port
Authorization: Bearer <JWT>
Content-Type: application/json

{"projectId":12,"port":5173}
```

```json
{
  "success": true,
  "data": {"port":5173,"ownerId":"draft:12:port:5173"},
  "error": null,
  "meta": null
}
```

La reserva vence en 300 segundos. No reserva un deployment ni abre un contenedor. POST no permite indicar ownerId o TTL: el controlador los determina. El puerto puede estar ocupado por un proceso externo aunque no aparezca en GET; reservePort prueba bind y puede responder 409.

## Listar y liberar

GET /port devuelve, dentro de data:

```json
{
  "port-reservation:owner:draft:12:port:5173": "port-reservation:port:5173",
  "port-reservation:owner:id-docker-ilustrativo": "port-reservation:port:8080"
}
```

Un mapa vacío significa que getAll no encontró owners válidos; no significa que todos los puertos del SO estén libres. El nombre interno availablePorts no cambia ese contrato.

DELETE /port/12/5173 devuelve data {released:true} si pudo borrar el par draft y false si no pudo liberarlo. No modifica recursos Docker ni filas DeploymentService. El esquema de error global es `{success:false,data:null,error:{code,message},meta:null}`.

## Errores de reservas

| HTTP | Causa |
| --- | --- |
| 400 | Port no válido, projectId no entero o parámetros no parseables |
| 401 | POST/DELETE con sesión ausente, inválida o expirada |
| 409 | reservePort devuelve false por conflicto o indisponibilidad TCP |
| 500 | Excepción no convertida de Redis/socket u otra infraestructura |

No se distingue por HTTP 409 si el conflicto es de owner Redis o del socket TCP. Consultar logs de reserva para el detalle disponible.

## Clasificar servicios

POST /deployment/:deploymentId/classify pertenece al controlador de Deployment. Requiere JWT, usa ID string sin ParseUUIDPipe y no consume body. Retorna 201 con DeploymentResponse actualizado. La precondición exige servicios persistidos presentes y running, con o sin publicaciones.

404: deployment no existe. 409: sin servicios, falta un contenedor, no está running, falla list/inspect o faltan inspecciones/resultados. Un Classification.kind conflict no es ese 409: se guarda UNKNOWN y puede responder éxito. El detalle de candidatos/evidence no se expone por HTTP.

## Consultar asignaciones

GET /deployment/:deploymentId/ports requiere JWT y devuelve puertos ORM/metadatos de Compose, no reservas Redis ni sondas. Solo estados building/starting/running se consideran activos; fuera de ellos port null. Ver [[Deployment - Endpoints]].

No existen endpoints de probe(host,ports), hold, handoff, restore, consulta de evidencia completa ni liberación arbitraria por containerId. Esos contratos son internos.
''', ['src/ports/presentation/port.controller.ts', 'src/ports/application/dto/reserve-port.dto.ts', 'src/ports/application/draft-port-owner.ts', 'packages/shared/src/ports/requests/reserve-port.request.ts', 'packages/shared/src/ports/responses/port-reservations.response.ts', 'src/main.ts', 'src/deployment/presentation/deployment.controller.ts', 'src/deployment/application/use-cases/get-deployment-ports.use-case.ts']),

'Ports - Frontend y uso': ('''# Ports · frontend y uso

## Consulta de reservas

portService llama GET /port, POST /port y DELETE /port/projectId/port con apiClient. usePorts usa TanStack Query con key ['ports'], staleTime 30 s, gcTime 5 min y refetchInterval 30 s. Una respuesta fallida hace que queryFn lance error. Expone reservedPorts ({} si no hay datos), loading/fetching/error y refresh.

parseReservations transforma ownerKey → portKey a filas `{port,owner}`. Reconoce owners de deployment y draft para mostrar mensajes; otros como IDs Docker se muestran directamente. checkPublishedPort valida número/rango 1..65535 y busca conflictos en esas filas; no consulta sockets.

Sus estados son empty, invalid, free y reserved con conflicts. free significa **sin reserva conocida en esa lista**, no disponibilidad del sistema operativo ni del daemon. La lectura puede estar desactualizada entre refetches.

## Hook de reserva provisional

usePortReservation(projectId,value,blocked) usa parseSinglePort: solo dígitos, entero entre 1 y 65535. No reserva rangos. Mantiene resultado asociado a key projectId:port, con estados idle, pending, reserved (ownerKey) y failed (message).

```mermaid
flowchart TD
    A[Valor del campo] --> B{¿Puerto individual válido?}
    B -->|No| I[idle; sin solicitud]
    B -->|Sí| W[Esperar 600 ms]
    W --> C{¿blocked en el momento del timer?}
    C -->|Sí| I
    C -->|No| P[pending y POST port]
    P -->|Fallo| F[failed]
    P -->|Éxito| Q[Invalidar consulta de reservas]
    Q --> R[reserved con ownerKey]
    R -->|Cambio, borrado o desmontaje| D[DELETE draft]
    R -->|Owner ausente tras consulta válida| A
```

El debounce espera 600 ms sin cambio de key. El effect usa una ref para leer blocked al dispararse; no depende directamente de blocked para reinstalar el timer. Cambiar únicamente blocked no garantiza por sí solo un nuevo intento si el timer anterior ya terminó bloqueado.

Al reservar con éxito espera invalidación/refetch antes de publicar reserved, para no tratar la lista antigua como expiración. Si la petición termina después del desmontaje o cambio de valor, libera la reserva recién creada. Al limpiar el effect cancela el timer y libera si había reservado.

Si está reserved, la consulta terminó sin error y su ownerKey desapareció, descarta ese resultado e incrementa attempt para intentarlo de nuevo. No renueva periódicamente un TTL que aún existe. Un POST fallido publica failed; no hay un retry específico del hook para ese conflicto sin cambios que vuelvan a ejecutar el efecto.

Como owner depende solo de proyecto/puerto, dos pestañas o campos con la misma identidad no tienen owners independientes. Una liberación de uno puede afectar el draft compartido. La expiración de servidor limita la vida si el frontend no puede liberar.

## Campo DeployPortField

Si recibe assignedPort, muestra el valor deshabilitado y pasa null al hook para evitar reservar de nuevo. disabled o !canCheckPorts también bloquean chequeos y pasan null. Mientras pending el input es readOnly y muestra estado de carga.

Si no hay asignación, compara publishedPort con reservas y usa check.status reserved como blocked. El componente no filtra protocolos para el hook: un número individual en un mapping UDP también puede solicitar una **reserva TCP**. El backend de Ports no tiene campo protocol. Los rangos se pueden comprobar visualmente, pero el hook no los reserva.

El mensaje free se presenta como “Puerto no reservado por Neoglito”. Que el input muestre un check verde tras reserve confirma la reserva provisional, no que el servicio haya arrancado.

## Asignaciones de despliegues

ProjectDeployTab consulta asignaciones al abrir y no reintenta automáticamente esa query (retry false). Mientras carga o falla, el detalle puede bloquear campos y ofrece reintentar. assignedDeploymentPort asocia archivo/servicio y solo infiere el único TCP one-to-one de ese servicio.

Al desplegar, el backend libera el draft y crea hold. El frontend envía mirrorPorts true, con sus restricciones propias: que un rango/UDP pueda representarse en el formulario no implica que ese modo lo admita. Después invalida consultas de puertos/reservas. Ver [[Deployment - Modo espejo]].

## Consumo interno

```typescript
// En un proveedor que ya inyecta PORT_RESERVATION_PORT:
const held = await this.reservations.holdPort(8080, 'deployment:id:port:8080');
if (!held) throw new Error('No se pudo retener el puerto');
await held.handoff();
// El coordinador debe arrancar el runtime y gestionar cleanup/transferencia.
```

El contrato no guarda Prisma ni inicia Docker automáticamente. Para clasificar, proporcionar el conjunto completo de ContainerInspection al token CONTAINER_CLASSIFICATION_PORT; así el discriminador de consumidores tiene contexto. El flujo público recomendado es classify del deployment existente.
''', ['apps/web/src/features/ports/port.service.ts', 'apps/web/src/features/ports/port-reservations.ts', 'apps/web/src/features/ports/use-ports.ts', 'apps/web/src/features/ports/use-port-reservation.ts', 'apps/web/src/features/projects/components/deploy/deploy-port-field.tsx', 'apps/web/src/features/projects/components/deploy/project-deploy-tab.tsx', 'apps/web/src/features/projects/deployment-assigned-ports.ts', 'src/ports/application/port-reservation.port.ts']),
})

notes.update({
'Ports - Pipeline huellas HTTP': ('''# Ports · pipeline: huellas HTTP

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
''', ['src/ports/infrastructure/classification/discriminator-http.ts', 'src/ports/infrastructure/classification/discrimination.ts', 'src/ports/infrastructure/classification/tests/discriminator-http.spec.ts']),

'Ports - Pipeline configuracion de servidores': (r'''# Ports · pipeline: configuración de servidores

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
''', ['src/ports/infrastructure/classification/discriminator-webserver.ts', 'src/ports/infrastructure/classification/container-classification.service.ts', 'src/container/infrastructure/docker/docker-compose-runtime.service.ts', 'src/ports/infrastructure/classification/tests/discriminator-webserver.spec.ts']),

'Ports - Pipeline consumidores y comandos': ('''# Ports · pipeline: consumidores y comandos

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
''', ['src/ports/infrastructure/classification/discriminator-broker.ts', 'src/ports/infrastructure/classification/discriminator-command.ts', 'src/ports/infrastructure/classification/handler-protocol.ts', 'src/ports/infrastructure/classification/container-classification.service.ts']),
})

notes.update({
'Ports - Pipeline recorrido': ('''# Ports · pipeline: recorrido completo

## Entrada y salida reales

El pipeline se activa con POST /deployment/:deploymentId/classify, protegido por JWT. El controlador llama ClassifyDeploymentServicesUseCase. Esta operación no crea contenedores ni reserva puertos; observa un despliegue existente y actualiza sus filas.

```mermaid
sequenceDiagram
    participant H as Controller HTTP
    participant U as Caso de uso Deployment
    participant P as Prisma
    participant R as Runtime
    participant C as Clasificador Ports
    participant N as Red TCP y HTTP
    H->>U: execute(deploymentId)
    U->>P: Deployment con servicios
    U->>R: list(Compose guardado, proyecto)
    U->>U: Verificar IDs persistidos y running
    U->>R: inspect(todos los IDs observados)
    U->>U: Verificar inspección de IDs persistidos
    U->>C: classify(inspecciones)
    Note over C: Contextos compartidos, hechos y candidatos por contenedor
    opt La imagen no resuelve
        C->>N: Sondear TCP publicados si existen
    end
    opt Desempates aplicables
        C->>N: Huellas HTTP de puertos identificados HTTP
        C->>R: Archivos de configuración mediante exec
        Note over C: Consumidores y comandos se evalúan en memoria
    end
    C-->>U: Classification por containerId
    U->>U: Verificar resultado por cada servicio persistido
    U->>P: Transaction: tipo, port, status, health, fecha
    U->>P: Recargar Deployment con servicios
    U-->>H: Entidad convertida a DeploymentResponse
```

## 1. Precondiciones del caso de uso

Busca Deployment con servicios; inexistente → 404 y servicios vacíos → 409. list usa composePath guardado y el nombre independiente si corresponde a un archivo generado actual. Cada ID persistido debe aparecer y tener status running. No exige health healthy ni publicación de puertos.

Si Docker recreó contenedores con otros IDs, rechaza aunque tengan el mismo nombre Compose. No incorpora filas nuevas automáticamente. Si list observa contenedores adicionales, también los inspecciona para enriquecer el contexto; solo actualiza filas ya persistidas.

Errores de list/inspect se convierten en 409. Exige que todas las filas persistidas estén entre las inspecciones recibidas. No espera readiness ni reintenta estas precondiciones.

## 2. Preparación del contexto

ContainerClassificationService añade host = CONTAINER_PROBE_HOST o 127.0.0.1 a cada inspección y renombra containerId como id. Conserva image, aliases, ports, command y env. No hace DNS de aliases para sondear: todos los puertos se consultan sobre ese host configurado.

Construye una cadena con imagen, protocolo y un handler de discriminadores. El discriminador de uso recibe todos los contextos, incluso los que después tengan una clasificación UNKNOWN. No necesita esperar a la clasificación de los consumidores para leer sus variables.

## 3. Ejecución por contenedor

```mermaid
flowchart TD
    A[Contexto del contenedor] --> B[Candidatos: ocho tipos; facts y evidence vacíos]
    B --> I[Handler de imagen]
    I -->|resolved o conflict| F[Resultado terminal]
    I -->|pass o narrowed| P[Handler de protocolo]
    P -->|resolved o conflict| F
    P -->|pass o narrowed| D[Handler de discriminadores aplicables]
    D -->|resolved o conflict| F
    D -->|sin resolución| E[unknown o ambiguous al agotar cadena]
    E --> F
```

La cadena es secuencial dentro de cada contexto. Los contextos se clasifican mediante Promise.all: varios contenedores pueden abrir sockets/ejecutar lecturas a la vez. Dentro de probeContainer también hay paralelismo entre puertos; los intentos de protocolo de un puerto son secuenciales.

No hay un límite explícito de concurrencia, caché de resultados entre requests ni timeout global del pipeline. Los caches internos de huellas HTTP solo viven durante fingerprintPort. Los candidatos, facts y evidence son nuevos por contenedor y no se comparten como estado mutable.

## 4. Persistencia

El caso de uso exige un resultado para cada ID guardado. Si kind resolved, guarda type, incluso si es UNKNOWN explícito. Para ambiguous, conflict y unknown guarda UNKNOWN. No transforma un conflict de clasificación en error HTTP: puede terminar con éxito y UNKNOWN.

Actualiza en una transacción serviceType, el único port de list, status, health y lastObservedAt común. No guarda la lista completa de inspect ni la evidencia. Después recarga el despliegue y responde. Un error del clasificador fuera de catches o de Prisma puede resultar en 500; un rechazo de Promise.all no cancela los I/O ya iniciados.

## Qué significa el resultado

Una resolución temprana por catálogo puede omitir todas las comprobaciones de red. Un UNKNOWN guardado puede corresponder a una herramienta conocida, falta de evidencia, múltiples roles o evidencia incompatible. El pipeline clasifica por prioridad de reglas; no calcula puntuaciones ni confirma exhaustivamente todas las señales.

Continuar en [[Ports - Pipeline candidatos y veredictos]] y [[Ports - Pipeline ejemplos paso a paso]].
''', ['src/deployment/presentation/deployment.controller.ts', 'src/deployment/application/use-cases/classify-deployment-services.use-case.ts', 'src/ports/infrastructure/classification/container-classification.service.ts', 'src/ports/infrastructure/classification/classification.ts']),

'Ports - Pipeline candidatos y veredictos': ('''# Ports · pipeline: candidatos y veredictos

## Estado inicial

classify crea facts `{}`, evidence `[]` y candidates = ALL_TYPES. ALL_TYPES toma Object.values(ServiceType) excluyendo UNKNOWN: BACKEND, FRONTEND, DATABASE, CACHE, MESSAGE_BROKER, WORKER, SCHEDULER y REVERSE_PROXY.

UNKNOWN es una salida o un tipo explícito del catálogo de herramientas; no es una opción que compita con los otros ocho en la intersección normal.

## Verdict de una etapa

| kind | Campos | Efecto del runner |
| --- | --- | --- |
| pass | Sin campos adicionales | Continúa sin modificar estado ni añadir evidencia |
| narrowed | candidates, evidence string | Añade evidencia y sustituye candidatos |
| resolved | type, evidence string | Añade evidencia y retorna inmediatamente |
| conflict | candidates, evidence string | Añade evidencia y retorna inmediatamente |

El runner no vuelve a preguntar a etapas anteriores ni ejecuta las posteriores después de resolved/conflict. No hay voto mayoritario, peso de confianza o selección aleatoria entre candidatos.

## Intersección: narrowTo

La función calcula remaining = candidates.filter(type => supported.includes(type)). Conserva el orden de los candidatos existentes, no el orden del hallazgo. Nunca amplía su conjunto.

```text
remaining = candidatos_actuales ∩ tipos_respaldados
0 elementos  → conflict, con candidatos previos
1 elemento   → resolved, con ese tipo
2+ elementos → narrowed, con remaining
```

Ejemplo: `{CACHE, MESSAGE_BROKER}` ∩ `{MESSAGE_BROKER}` resuelve broker. El mismo conjunto intersectado con `{DATABASE}` produce conflict y conserva CACHE/MESSAGE_BROKER en el resultado; el tipo incompatible no se añade a candidates. Su origen se representa en el string de evidencia.

Un narrowed puede dejar exactamente los mismos candidatos. Registra evidencia pero no garantiza que se haya eliminado una opción.

## Finalización sin salida terminal

Si se agotan handlers y la cantidad de candidatos sigue igual a ALL_TYPES.length, devuelve unknown. Si queda uno, devuelve resolved; si quedan varios reducidos, devuelve ambiguous.

Esta decisión compara la cantidad, no la longitud de evidence: podría existir evidencia que respalde todos los candidatos y aun así resultar unknown. Con los handlers actuales, los hallazgos habituales reducen conjuntos más pequeños.

## Facts

ClassificationFacts solo declara ports?: readonly PortResult[]. El handler de protocolo los escribe para que HTTP reutilice qué puertos fueron identificados como http. Imagen no escribe esos hechos. Si imagen resuelve, no se sondea y no existen facts de red para ese recorrido.

facts no es la misma información que ctx.ports: ctx.ports contiene números publicados; facts.ports contiene el resultado de intentar alcanzar e identificar cada uno.

## Selección de discriminadores

Un Discriminator declara name, resolves y discriminate(ctx,candidates,facts). Devuelve Finding `{types,evidence}` o null. resolves es el dominio de candidatos sobre el que sabe trabajar; no es su resultado fijo.

El handler copia la lista como pending y current como candidatos de entrada. Mientras quedan al menos dos candidatos:

1. Busca el primer pending cuyo resolves **incluya todos** los current.
2. Lo retira de pending antes de ejecutarlo: como máximo una vez por contenedor.
3. Si retorna null o lanza, no cambia current y busca otro aplicable.
4. Si hay Finding, añade `nombre: evidencia` y aplica narrowTo.
5. Cero coincidencias termina en conflict; una termina el bucle con resolución; varias permiten otro intento.

La condición es `current ⊆ resolves`, no una simple intersección no vacía. El discriminador HTTP no se ejecuta mientras aún compitan WORKER o CACHE. Config web solo actúa cuando todas las opciones son FRONTEND/REVERSE_PROXY.

La búsqueda se repite desde el principio de los discriminadores pendientes. Uno inicialmente no aplicable puede volverse aplicable después de que otro reduzca current. El orden de prioridad se combina con esa reevaluación, no es un for que omita definitivamente una etapa por su posición inicial.

## Orden y evidencia

El servicio instala: huella HTTP → config web → uso por otros contenedores → comando. Si una resuelve, las siguientes no contrastan su conclusión. null significa evidencia no disponible o no encontrada; el wrapper también convierte una excepción a null, sin registrar la causa allí.

El handler une hallazgos internos con ` · ` y el runner agrega ese string como una entrada de evidence. Imagen y protocolo añaden sus propias entradas. Esta estructura sirve para explicar el recorrido interno, pero no se persiste ni se devuelve en DeploymentResponse.
''', ['src/ports/infrastructure/classification/classification.ts', 'src/ports/infrastructure/classification/discrimination.ts', 'src/ports/infrastructure/classification/container-classification.service.ts', 'src/ports/application/container-classification.port.ts', 'src/deployment/domain/value-objects/service-type.ts']),

'Ports - Pipeline imagen y protocolo': ('''# Ports · pipeline: imagen y protocolo

## Etapa 1: imagen

imageHandler llama lookupImage(ctx.image). Si no hay regla, devuelve pass. Si la regla contiene exclusivamente UNKNOWN, resuelve UNKNOWN directamente. Para otros candidatos usa narrowTo con `imagen: nombre de regla`.

normalizeImageRef aplica trim/minúsculas, quita digest tras @ y tag después del último slash. Quita registry cuando el primer segmento contiene punto, dos puntos o es localhost; elimina library si corresponde. Conserva el namespace restante.

| Referencia | Normalizada |
| --- | --- |
| docker.io/library/postgres:16-alpine@sha256:ejemplo | postgres |
| mcr.microsoft.com/mssql/server:2022-latest | mssql/server |
| localhost:5000/miorg/billing:version | miorg/billing |

El índice se construye al cargar el módulo y lanza si una imagen está repetida entre reglas. No consulta Docker Hub, manifests o procesos para comprobar que una imagen etiquetada cumpla su rol.

## Catálogo actual

| Grupo | Imágenes normalizadas | Candidatos |
| --- | --- | --- |
| PostgreSQL | postgres, pgvector/pgvector, postgis/postgis, timescale/timescaledb, bitnami/postgresql | DATABASE |
| MySQL/MariaDB | mysql, bitnami/mysql, mariadb, bitnami/mariadb | DATABASE |
| SQL Server/Oracle | mssql/server, gvenzl/oracle-xe, gvenzl/oracle-free, database/free | DATABASE |
| NoSQL | mongo, bitnami/mongodb, cassandra, couchdb, neo4j, influxdb | DATABASE |
| Búsqueda | elasticsearch, elasticsearch/elasticsearch, opensearchproject/opensearch | DATABASE |
| Memcached | memcached, bitnami/memcached | CACHE |
| Redis/Valkey | redis, bitnami/redis, redis/redis-stack, redis/redis-stack-server, valkey/valkey, bitnami/valkey | CACHE, MESSAGE_BROKER |
| RabbitMQ | rabbitmq, bitnami/rabbitmq | MESSAGE_BROKER |
| Kafka | apache/kafka, bitnami/kafka, confluentinc/cp-kafka, redpandadata/redpanda | MESSAGE_BROKER |
| Otros brokers | nats, apache/activemq-artemis, apache/activemq-classic, eclipse-mosquitto | MESSAGE_BROKER |
| Proxy dedicado | traefik, haproxy, envoyproxy/envoy, nginxproxy/nginx-proxy, jc21/nginx-proxy-manager | REVERSE_PROXY |
| Servidor web | nginx, nginxinc/nginx-unprivileged, bitnami/nginx, caddy, httpd | REVERSE_PROXY, FRONTEND |

Herramientas resueltas UNKNOWN: mongo-express, dpage/pgadmin4, adminer, rediscommander/redis-commander, provectuslabs/kafka-ui, mher/flower, axllent/mailpit, mailhog/mailhog, prometheuscommunity/postgres-exporter, oliver006/redis_exporter y nginx/nginx-prometheus-exporter.

Una regla de tipo único finaliza antes de sondear. Por ejemplo, postgres se clasifica DATABASE aunque no publique un puerto. Clasificar por esa imagen no verifica disponibilidad del protocolo PostgreSQL.

## Etapa 2: protocolo sin publicaciones

Si ctx.ports está vacío, escribe facts.ports = []. Consulta findingFromCommand: si reconoce tarea, acota a WORKER/SCHEDULER para habilitar el discriminador de comando. Todavía no selecciona el tipo específico. Si no reconoce tarea, hace pass.

No publicar puertos no prueba que no existan listeners internos. Una imagen nginx o redis aún puede pasar a configuración/uso sin red; una imagen desconocida con `node server.js` mantiene los ocho tipos y acaba unknown porque ningún discriminador cubre ese conjunto completo.

## Etapa 2: protocolo con publicaciones

Llama probe.probe(ctx.ports, ctx.host) y guarda sus PortResult. no_listeners acota a WORKER/SCHEDULER. unidentified hace pass. identified reúne la **unión** de tipos compatibles con todos los protocolos reconocidos y la intersecta con los candidatos actuales.

| Protocolo | Tipos compatibles |
| --- | --- |
| mysql, postgres, mongo | DATABASE |
| resp | CACHE, MESSAGE_BROKER |
| memcached | CACHE |
| nats, amqp, kafka, mqtt | MESSAGE_BROKER |
| http | BACKEND, FRONTEND, REVERSE_PROXY, DATABASE |

Múltiples protocolos pueden mantener varios tipos; no se elige un puerto ganador ni se intersectan las categorías de cada puerto entre sí. El orden final viene del conjunto de candidatos original.

La evidencia es `protocolo: lista` o `protocolo: nada escucha`. No se valida el número de puerto como indicio de tecnología: 5432 solo importa si la respuesta se reconoce como postgres.

## Consecuencias

no_listeners significa que las conexiones no llegaron a establecerse desde el host configurado. Puede deberse a red, firewall o inicio tardío. La acotación a tareas es una heurística del pipeline. Una imagen redis acotada a CACHE/BROKER cuyos puertos se observen todos closed produce conflict antes de poder evaluar sus consumidores.

Un banner no reconocido se queda unidentified sin probar peticiones client-first en ese puerto. Si la imagen había dejado nginx como FRONTEND/REVERSE_PROXY, un protocolo incompatible puede producir conflict; si la imagen ya resolvió, no se ejecuta este contraste.

Los detalles de bytes y temporización están en [[Ports - Sondas TCP y mensajes]].
''', ['src/ports/infrastructure/classification/handler-image.ts', 'src/ports/infrastructure/classification/handler-protocol.ts', 'src/deployment/domain/services/service-image-catalog.ts', 'src/deployment/domain/services/protocol-service-type.ts']),

'Ports - Sondas TCP y mensajes': (r'''# Ports · sondas TCP y mensajes

## Capas

protocol-probes.ts define funciones puras: qué Buffer enviar y cómo reconocer otro Buffer. port-identification.ts realiza el I/O con node:net. TcpContainerProbeService selecciona orden y host; no escribe Redis ni Prisma.

Orden recibido por identifyPort: mysql, nats, postgres, mongo, resp, memcached, amqp, kafka, mqtt y http. MySQL/NATS esperan banner; las demás hablan primero. HTTP va al final entre las peticiones porque es una respuesta genérica.

## Algoritmo de un puerto

```mermaid
flowchart TD
    A[Conectar sin payload] --> B{¿Conectó?}
    B -->|No| C[closed]
    B -->|Sí| D{¿Recibió banner?}
    D -->|Sí| E[Comparar solo sondas server-first permitidas]
    E -->|Coincide| I[identified]
    E -->|No coincide| U[unidentified]
    D -->|No| F[Intentar cada sonda client-first en orden]
    F --> G[Conexión nueva y payload]
    G -->|Respuesta reconocida| I
    G -->|No reconocida o falla| H{¿Quedan sondas?}
    H -->|Sí| F
    H -->|No| U
```

exchange crea un socket por intento. Antes de connect configura 1000 ms; tras connect espera 300 ms para banner o 1000 ms para respuesta. Si hay payload lo escribe. El primer evento data termina el intercambio y destruye el socket. timeout/error/close también lo terminan, protegido por settled para resolver una sola vez.

Si conecta pero no recibe datos, devuelve connected true con Buffer vacío. Si nunca conecta devuelve connected false. Después de una apertura exitosa, fallos de intentos posteriores no cambian el resultado a closed: termina unidentified si nadie reconoce.

## Mensajes y reglas de reconocimiento

| Protocolo | Mensaje / condición | Reconocimiento implementado |
| --- | --- | --- |
| mysql | Sin payload; servidor presenta banner | Más de 4 bytes, secuencia byte 3 igual a 0, byte 4 igual a 0x0a o 0xff |
| nats | Sin payload | Texto empieza `INFO {` |
| postgres | SSLRequest: 8 bytes, código 80877103 | Exactamente un byte S (0x53) o N (0x4e) |
| mongo | OP_MSG 2013 con hello:1 y $db admin; requestId 42 | Al menos 16 bytes, responseTo 42 y opcode 2013 |
| resp | `PING\r\n` | Prefijo +PONG o error RESP con mayúsculas y espacio, p. ej. -NOAUTH |
| memcached | `version\r\n` | Prefijo VERSION seguido de espacio |
| amqp | Header AMQP 0-0-9-1 | Frame tipo 1/canal 0 con al menos 7 bytes, o prefijo AMQP |
| kafka | ApiVersions v0, correlationId 42, clientId nulo | Al menos 8 bytes y correlationId 42 en offset 4 |
| mqtt | CONNECT 3.1.1, clean session, clientId vacío | Al menos 4 bytes, primeros bytes 0x20 0x02 (CONNACK) |
| http | HEAD / HTTP/1.1 con Host, User-Agent hub-classifier y Connection close | Línea comienza HTTP/versión y código de tres dígitos |

Las reglas no completan autenticación ni sesiones. Un error reconocible puede bastar para identificar protocolo, como RESP que exige contraseña. El objetivo es reconocer la tecnología, no validar credenciales o disponibilidad funcional completa.

## Agregación por contenedor

probeContainer sondea todos los números en paralelo mediante Promise.all. No deduplica ni valida los números recibidos por sí mismo; normalmente vienen normalizados de inspect. Retorna PortResult en el orden de entrada.

- Si todos son closed, outcome no_listeners. Una lista vacía también cumple every y produciría no_listeners si se llama directamente; el handler de protocolo evita esa llamada en el flujo normal sin publicaciones.
- Si no hay protocolos identificados pero algún puerto conectó, outcome unidentified.
- Si hay alguno, outcome identified con protocolos deduplicados, aunque otros estén closed/unidentified.

## Coste y límites

Un puerto silencioso puede abrir nueve conexiones: apertura más ocho sondas client-first. Por contenedor se ejecutan en paralelo los puertos y por clasificación los contenedores; no hay un pool que limite el fan-out. Los tiempos son por socket, no una fecha límite de toda la petición.

Solo lee el primer bloque TCP, sin reensamblar mensajes fragmentados. Una firma que llegue dividida puede no reconocerse. Tampoco negocia TLS/HTTPS ni usa UDP. El SSLRequest de PostgreSQL solo identifica el byte de respuesta; no inicia TLS después.

Un banner que no coincide impide los intentos client-first de ese puerto. Los timeouts/errores de conexión no distinguen firewall, servicio ausente, DNS incorrecto o red inaccesible. Las sondas envían tráfico de protocolo al servicio; no son un escaneo pasivo de metadatos Docker.

CONTAINER_PROBE_HOST debe permitir alcanzar los puertos **publicados**, no necesariamente los internos. La dirección host_ip original no se preserva en la lista de inspect, por lo que un único host configurado puede no alcanzar todos los bindings.
''', ['src/ports/infrastructure/probing/protocol-probes.ts', 'src/ports/infrastructure/probing/port-identification.ts', 'src/ports/infrastructure/probing/tcp-container-probe.service.ts', 'src/container/application/container-runtime.port.ts']),
})

notes.update({
'Ports - Indice': ('''# Ports · documentación técnica

`PortModule` gestiona reservas de puertos y aporta un pipeline de clasificación de contenedores. Son funciones conectadas por Deployment, pero sus resultados tienen significados distintos: una reserva es coordinación en Redis; una sonda identifica un protocolo alcanzable; una clasificación propone el rol del servicio.

Documentación inferida del código revisado el **10 de octubre de 2026**. Incluye el comportamiento implementado, condiciones de ejecución, cortocircuitos, errores y limitaciones. Los ejemplos son explicativos; no se ejecutaron reservas, sondas ni despliegues para redactarla.

## Lectura del módulo

- [[Ports - Arquitectura y contratos]]: proveedores, interfaces, datos y consumidores.
- [[Ports - Reservas ciclo completo]]: formulario, hold, handoff, contenedor y liberación.
- [[Ports - Redis y ORM]]: claves, scripts Lua, TTL, atomicidad y persistencia.
- [[Ports - Endpoints]]: protección, parámetros, respuestas y errores.
- [[Ports - Frontend y uso]]: consulta, debounce, renovación y formularios.

## Lectura del pipeline

1. [[Ports - Pipeline recorrido]]: desde classify HTTP hasta la escritura Prisma.
2. [[Ports - Pipeline candidatos y veredictos]]: algoritmo central, conjuntos y finalización.
3. [[Ports - Pipeline imagen y protocolo]]: catálogo, sondas y primer filtrado.
4. [[Ports - Sondas TCP y mensajes]]: sockets, bytes, reconocimiento y tiempos.
5. [[Ports - Pipeline huellas HTTP]]: prioridad de huellas y consultas por ruta.
6. [[Ports - Pipeline configuracion de servidores]]: archivos y directivas web.
7. [[Ports - Pipeline consumidores y comandos]]: Redis como cache/broker y tareas.
8. [[Ports - Pipeline ejemplos paso a paso]]: trazas completas y resultados persistidos.
9. [[Ports - Diagnostico pruebas y extension]]: cómo investigar y ampliar el pipeline.

## Relaciones

[[Deployment - Indice]] coordina las operaciones y persiste su resultado. [[Container - Indice]] observa Docker, inspecciona metadatos y facilita lecturas mediante exec. [[Startup - Indice]] reconstruye reservas al iniciar. [[Autenticacion - Indice]] describe el JWT de los endpoints protegidos.

Ports no tiene un modelo Prisma propio ni un endpoint público de sondeo arbitrario. El detalle de candidatos y evidencia existe internamente; el endpoint de clasificación devuelve un DeploymentResponse con serviceType.
''', ['src/ports/port.module.ts', 'src/ports/presentation/port.controller.ts', 'src/ports/infrastructure/classification/container-classification.service.ts', 'src/deployment/application/use-cases/classify-deployment-services.use-case.ts']),

'Ports - Arquitectura y contratos': ('''# Ports · arquitectura y contratos

## Registro de proveedores

PortModule importa CacheModule y ContainerModule y registra PortController. Publica tres símbolos mediante useExisting: cada símbolo reutiliza la instancia de su clase, en lugar de crear un segundo proveedor.

| Token exportado | Implementación | Responsabilidad |
| --- | --- | --- |
| PORT_RESERVATION_PORT | RedisPortReservationService | Reservas y holds TCP |
| CONTAINER_PROBE_PORT | TcpContainerProbeService | Identificación de protocolos |
| CONTAINER_CLASSIFICATION_PORT | ContainerClassificationService | Clasificación del conjunto de inspecciones |

CacheModule exporta RedisConnection y CACHE_PORT; las reservas usan directamente RedisConnection.client y sus scripts Lua, no RedisCache. ContainerClassificationService inyecta runtime y probe. PortController solo inyecta el contrato de reservas.

## Contrato de reservas

```typescript
interface PortReservationPort {
  getAll(): Promise<PortReservationsResponse>;
  reservePort(port: number, ownerId: string, ttlSeconds?: number): Promise<boolean>;
  holdPort(port: number, ownerId: string, timeoutMs?: number): Promise<HeldPortReservation | null>;
  restorePort(port: number, ownerId: string): Promise<boolean>;
  releasePort(ownerId: string): Promise<boolean>;
}
interface HeldPortReservation {
  port: number;
  ownerId: string;
  handoff(): Promise<void>;
  handoff<T>(operation: () => Promise<T>): Promise<T>;
  release(): Promise<boolean>;
}
```

false/null señala rechazo previsto por validación o conflicto. Errores Redis y ciertos errores de cierre se propagan como excepciones: no todo fallo se convierte en boolean.

## Contrato de sondeo

`probe(ports: readonly number[], host?: string)` devuelve `{outcome, ports}`. TcpContainerProbeService toma el host predeterminado de CONTAINER_PROBE_HOST o 127.0.0.1. Un host explícito sustituye ese valor.

PortResult es closed, unidentified o identified con protocol. ProbeOutcome es no_listeners, unidentified o identified con protocolos deduplicados. El contrato identifica la respuesta observada por red; no devuelve ServiceType.

## Contrato de clasificación

`classify(containers: readonly ContainerInspection[])` devuelve un resultado por containerId. Cada inspección incluye image, aliases, todos los TCP publicados, command y env. El servicio los convierte en ContainerContext añadiendo id y host.

```typescript
type Classification =
  | { kind: 'resolved'; type: ServiceType; evidence: readonly string[] }
  | { kind: 'ambiguous'; candidates: readonly ServiceType[]; evidence: readonly string[] }
  | { kind: 'conflict'; candidates: readonly ServiceType[]; evidence: readonly string[] }
  | { kind: 'unknown'; evidence: readonly string[] };
```

El conjunto completo permite estudiar referencias de otros contenedores. No recibe una ruta Compose ni llama a list/inspect: esas acciones las realiza el caso de uso de Deployment antes de invocarlo.

## Consumidores

| Consumidor | Uso |
| --- | --- |
| PortController | Listar, reservar draft y liberar draft |
| DeployComposeUseCase | Liberar draft, hold/handoff y restore por containerId |
| StopDeploymentUseCase | Liberar por containerId |
| RestoreDeploymentPortReservationsService | restore de servicios guardados al arrancar |
| ClassifyDeploymentServicesUseCase | clasificar inspecciones y guardar tipos |

Dos estructuras se llaman ContainerContext: el sondeo solo requiere host/ports; la clasificación incluye metadatos adicionales. También debe distinguirse `ports` como módulo Nest del concepto de interfaz o puerto de arquitectura usado en nombres como ContainerRuntimePort.
''', ['src/ports/port.module.ts', 'src/ports/application/port-reservation.port.ts', 'src/ports/application/container-probe.port.ts', 'src/ports/application/container-classification.port.ts', 'src/shared/infrastructure/cache/cache.module.ts', 'src/ports/infrastructure/probing/port-identification.ts']),

'Ports - Reservas ciclo completo': ('''# Ports · reservas: ciclo completo

## Tres operaciones con propósitos diferentes

| Operación | Comprobación TCP | Redis | Socket retenido |
| --- | --- | --- | --- |
| reservePort | Intenta bind y cierra inmediatamente | Par de claves, TTL opcional | No |
| holdPort | Intenta bind y lo mantiene | Par de claves sin TTL | Sí, hasta handoff/release/timeout |
| restorePort | No comprueba disponibilidad | Registra par o acepta par idéntico, sin TTL nuevo | No |

Todas validan port entero 1..65535 y ownerId no vacío. La comprobación TCP usa `createServer().listen({port,host:'0.0.0.0',exclusive:true})` en el entorno de la API. No comprueba UDP, una IP concreta del mapping ni disponibilidad en un daemon remoto.

## Reserva del formulario

POST /port crea owner `draft:<projectId>:port:<port>` y TTL de 300 segundos. reservePort consulta ambas claves. Si cualquiera existe devuelve false, incluso si el par pertenece al mismo owner. Por tanto repetir POST mientras vive la reserva suele devolver 409: no renueva su TTL de forma idempotente.

Si no existen, prueba bind/cierre y ejecuta RESERVE_SCRIPT. La prueba de socket y Redis no son una operación atómica; el script resuelve conflictos Redis aparecidos después de la lectura. Una reserva provisional no mantiene ocupado el socket y no impide que un proceso externo tome el puerto.

## Hold antes de Docker

El preparador de Deployment reúne los TCP fijos del YAML final. Para cada uno el coordinador libera el draft y llama holdPort con owner `deployment:<deploymentId>:port:<port>`. Hold abre el socket primero, luego evalúa RESERVE_SCRIPT sin TTL.

Un rechazo del script cierra el socket y devuelve null. Un éxito agrega HeldPort a un Map del proceso con socket, timer y handedOff false. El timeout predeterminado es 30 000 ms: intenta releaseHeldPort y registra aviso. Es un temporizador Node, no una expiración Redis.

Si la evaluación Redis lanza una excepción después de abrir el socket, ese camino no tiene un finally que lo cierre. Un cierre abrupto del proceso elimina sus sockets pero no las reservas sin TTL. No hay un recolector periódico de owners de holds abandonados.

## Handoff

handoffHeldPort cancela el timer, marca handedOff true y cierra el socket. Conserva Redis. Si ya se hizo handoff o no encuentra el hold, retorna sin error; no prueba nuevamente que el par Redis siga presente.

La variante handoff(operation) ejecuta la operación después del cierre; si la operación falla intenta releasePort y vuelve a lanzar. DeployComposeUseCase usa **handoff() sin callback**, en paralelo para todos los holds, y después runtime.up. Su propio catch coordina la compensación.

```mermaid
sequenceDiagram
    participant U as Deployment
    participant R as Reserva
    participant S as Socket API
    participant K as Redis
    participant D as Docker
    U->>R: holdPort(N, owner temporal)
    R->>S: bind 0.0.0.0:N
    R->>K: Registrar par sin TTL
    U->>R: handoff()
    R->>S: close
    Note over K,D: Redis conserva owner; Docker aún no publica
    U->>D: up
    U->>D: list
    U->>R: releasePort(owner temporal)
    R->>K: Borrar par temporal
    U->>R: restorePort(N, containerId)
    R->>K: Registrar par del contenedor
```

Entre cerrar el socket e iniciar Docker existe una ventana en que otro proceso puede ocuparlo. Redis coordina clientes de Neoglito, no el sistema operativo completo.

## Transferencia y liberación

Después de list se liberan los owners temporales y se restaura el puerto observado por cada contenedor con port > 0. No es una sustitución atómica de owner: hay un intervalo sin reserva. restorePort funciona mientras Docker ocupa el puerto porque omite bind.

releasePort retira el hold local, cancela el timer y cierra el socket si no fue entregado. Luego el script borra ambas claves solo si el ownerKey existe y portKey confirma el mismo owner. Devuelve false si no hay par liberable. `held.release()` usa la misma limpieza.

Stop libera usando IDs persistidos de contenedores. DELETE /port solo construye owners draft y no libera los de contenedores. Ver [[Ports - Redis y ORM]] para claves, idempotencia y estados incompletos.
''', ['src/ports/infrastructure/reservations/redis-port-reservation.service.ts', 'src/ports/application/draft-port-owner.ts', 'src/deployment/application/use-cases/deploy-compose.use-case.ts']),

'Ports - Redis y ORM': ('''# Ports · Redis y ORM

## Persistencia de reservas

Ports no importa PrismaModule ni define tablas propias. Guarda la coordinación en Redis mediante dos claves relacionadas:

```text
port-reservation:port:5173 → draft:12:port:5173
port-reservation:owner:draft:12:port:5173 → 5173
```

La primera permite un owner por número de puerto. La segunda permite un puerto por owner. El diseño no diferencia hostIp, protocolo ni host de daemon: su espacio de reservas es global por número TCP en esa conexión Redis.

| Owner | Ejemplo | Vida |
| --- | --- | --- |
| Draft | draft:12:port:5173 | 300 s desde POST exitoso |
| Hold de deployment | deployment:UUID:port:5173 | Sin TTL Redis; timer local antes de handoff |
| Contenedor | ID Docker | Sin TTL al crear con restorePort |

La función draftPortOwnerId no incorpora usuario, sesión, campo ni pestaña. Formularios del mismo proyecto y puerto comparten identidad. El servidor no comprueba que ese projectId exista antes de reservar.

## Scripts Lua

RESERVE_SCRIPT y RESTORE_SCRIPT leen portOwner y ownerPort. Si ambos coinciden con el par solicitado, retornan 1 sin reescribir. Si solo existe una clave o hay una diferente, retornan 0. Si ninguna existe, escriben ambas y retornan 1.

RESERVE_SCRIPT aplica EXPIRE a ambas solo cuando recibe TTL. RESTORE_SCRIPT no lo aplica. Un par idéntico conserva cualquier TTL previo: restorePort no convierte automáticamente una reserva ya existente con TTL en permanente.

RELEASE_SCRIPT lee ownerKey, verifica que portKey correspondiente apunte al owner y solo entonces borra las dos. Si falta una o no coincide, retorna 0 sin reparar el estado parcial. Estos scripts son atómicos en Redis, pero no abarcan sockets, Docker o Prisma.

reservePort tiene una comprobación previa que rechaza claves existentes, por lo que su comportamiento público es menos idempotente que el script. restorePort llega directamente al script tras validar y sí acepta un par idéntico.

## getAll

Escanea `port-reservation:owner:*` mediante scanIterator con COUNT 100 y consulta cada lote con mGet. Convierte los valores a Number y conserva enteros 1..65535. Devuelve un mapa **ownerKey → portKey**, no un mapa port → owner ni una lista de puertos libres.

No verifica el par inverso. Una ownerKey válida sin portKey todavía puede aparecer. COUNT es una indicación para SCAN, no paginación HTTP; el endpoint completa la iteración. El resultado puede cambiar durante el recorrido por expiraciones o mutaciones concurrentes y no representa un snapshot transaccional.

## Datos ORM de contenedores

DeploymentService guarda id Docker, composeServiceName, un port Int, status, health, serviceType, lastObservedAt y deploymentId. Los enums y relaciones están en prisma/models/deployment.prisma. Port no es unique. Ports produce datos; el caso de uso de Deployment escribe Prisma.

inspect aporta todos los TCP publicados a la clasificación, pero runtime.list y DeploymentService conservan un puerto por contenedor. Los holds cubren todos los TCP fijos del YAML; después se liberan y solo los observados como ese único port se restauran por containerId. Los demás no quedan representados por ese modelo.

La clasificación guarda resolved.type o UNKNOWN para los demás resultados. También actualiza port/status/health/fecha, sin sincronizar reservas Redis. No persiste evidence, candidates, outcome de sondas, env, aliases ni command. Una respuesta UNKNOWN no permite reconstruir si el resultado interno fue unknown, ambiguous, conflict o resolved UNKNOWN.

## Recuperación al arrancar

Startup consulta servicios con status running/paused/restarting y port > 0 y llama restorePort secuencialmente. Si detecta pares en conflicto acumula IDs y hace fallar el bootstrap. No comprueba el daemon ni elimina reservas sobrantes. Consultar [[Startup - ORM y Redis]].

RedisConnection usa REDIS_URL o redis://localhost:6379, conecta en onModuleInit y quit en onModuleDestroy si está abierto. La persistencia del servidor Redis depende de su configuración; el código del cliente no configura AOF/snapshots.

Las cascadas Prisma no llaman a releasePort ni a Docker. Tampoco existe una transacción distribuida o reconciliación periódica. Los cuatro planos —Redis, sockets del proceso, Docker y filas ORM— pueden divergir después de fallos.
''', ['src/ports/infrastructure/reservations/redis-port-reservation.service.ts', 'src/shared/infrastructure/cache/redis-connection.service.ts', 'prisma/models/deployment.prisma', 'src/deployment/application/use-cases/classify-deployment-services.use-case.ts', 'src/startup/restore-deployment-port-reservations.service.ts']),
})

vault = Path('C:/Users/Uriel-Galvan/Documents/neoglito/neoglito')
existing = {p.stem for p in vault.rglob('*.md')}
word_count = 0
for title, (body, sources) in notes.items():
    for link in re.findall(r'\[\[([^\]]+)\]\]', body):
        assert link in notes or link in existing, (title, link)
    assert body.count('```') % 2 == 0, (title, 'unclosed code fence')
    footer = '\n## Fuentes del código\n\n'
    for source in sources:
        file = repo / source
        assert file.is_file(), source
        footer += f'- [{source}]({file.as_uri()})\n'
    metadata = '---\ntags:\n  - neoglito\n  - ports\n  - documentacion-tecnica\nfuncionalidad: ports\nactualizado: 2026-10-10\n---\n\n'
    navigation = '' if title == 'Ports - Indice' else '\nVolver a [[Ports - Indice]].\n'
    content = metadata + body.strip() + '\n' + navigation + footer
    (out / f'{title}.md').write_text(content, encoding='utf-8')
    word_count += len(body.split())
print(f'{len(notes)} notas de Ports, {word_count} palabras; enlaces, fuentes y bloques verificados.')
