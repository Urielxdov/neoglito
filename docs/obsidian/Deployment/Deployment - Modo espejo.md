---
tags:
  - neoglito
  - deployment
  - documentacion-tecnica
funcionalidad: deployment
actualizado: 2026-10-10
---

# Deployment · modo espejo

`mirrorPorts: true` cambia tanto el puerto publicado como el target de los mappings enviados e intenta adaptar el listener. Omitido o false conserva el puerto interno original. El frontend actual lo envía true.

## Condiciones

Cada mapping enviado en este modo necesita protocol tcp y target/published individuales formados por dígitos. No permite published null, rangos ni UDP para esos cambios. Si un servicio tiene varios cambios con distintos puertos finales, los rechaza. Si el puerto interno previo y final son iguales, omite la adaptación del listener de ese servicio.

No adapta automáticamente todos los listeners del YAML. Solo procesa los cambios recibidos en ports. Si no sabe configurar uno, devuelve 400 antes de arrancar Docker.

## Adaptaciones implementadas

| Detección | Modificación |
| --- | --- |
| Último segmento de image igual a postgres, sin tag/digest | Ajusta command con postgres -p y añade PGPORT |
| Último segmento de image igual a redis, sin tag/digest | Ajusta command con redis-server --port |
| Comando reconocido de Vite o desarrollo de @neoglito/web | Ajusta --port y añade PORT |
| environment ya contiene PORT o comando coincide con npm run start | Asigna PORT |
| Otro listener | Rechaza con mensaje para configurar PORT o command |

Para postgres/redis acepta comandos ausentes, arrays de strings y strings simples sin comillas, saltos de línea ni ciertos operadores shell. Un ejecutable diferente puede hacer fallar la adaptación. No se usa el catálogo general de imágenes para detectar estos listeners: la detección del helper es más limitada.

Redis adapta healthcheck solo cuando test es array CMD/redis-cli. Otras variantes array se rechazan; variantes no array no reciben esta adaptación. No existe una reescritura general de healthchecks para todas las aplicaciones. En expose cambia entradas iguales al puerto interno anterior.

Asignar PORT presupone que la aplicación lo respeta. El helper no verifica en ejecución que realmente escuche ahí.

## URLs de otros servicios

Recorre valores string de environment interpretables como URL con puerto explícito. Para hostname igual al nombre del servicio o su container_name original, busca el puerto interno anterior. Para localhost, 127.0.0.1 y host.docker.internal busca el publicado anterior, o el interno si no había publicado fijo.

Solo reescribe si encuentra exactamente un cambio compatible. Conserva el resto del string mediante sustitución del puerto. No reescribe DSN sin formato URL, URLs sin puerto explícito, referencias ambiguas ni variables en archivos externos. Tampoco cambia el hostname cuando posteriormente renombra container_name.

Ejemplo conceptual, enviado con targetPort 5432 y publishedPort 15432:

```text
Antes: db publica 5432:5432; api usa postgresql://db:5432/app
Después: db publica 15432:15432, escucha con postgres -p 15432
         api usa postgresql://db:15432/app
```

Estas reglas describen una adaptación soportada por el código, no una garantía universal de conectividad. Para mantener el target original desde la API, usar mirrorPorts false y enviar el published deseado.

## Fuentes del código

- [src/deployment/infrastructure/compose/mirror-service-ports.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/infrastructure/compose/mirror-service-ports.ts)
- [src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts)
- [apps/web/src/features/projects/deployment-request.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/deployment-request.ts)
