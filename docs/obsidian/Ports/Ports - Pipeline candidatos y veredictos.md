---
tags:
  - neoglito
  - ports
  - documentacion-tecnica
funcionalidad: ports
actualizado: 2026-10-10
---

# Ports · pipeline: candidatos y veredictos

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

Volver a [[Ports - Indice]].

## Fuentes del código

- [src/ports/infrastructure/classification/classification.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/classification.ts)
- [src/ports/infrastructure/classification/discrimination.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/discrimination.ts)
- [src/ports/infrastructure/classification/container-classification.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/container-classification.service.ts)
- [src/ports/application/container-classification.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/application/container-classification.port.ts)
- [src/deployment/domain/value-objects/service-type.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/domain/value-objects/service-type.ts)
