---
tags:
  - neoglito
  - ports
  - documentacion-tecnica
funcionalidad: ports
actualizado: 2026-10-10
---

# Ports · documentación técnica

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

## Fuentes del código

- [src/ports/port.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/port.module.ts)
- [src/ports/presentation/port.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/presentation/port.controller.ts)
- [src/ports/infrastructure/classification/container-classification.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/classification/container-classification.service.ts)
- [src/deployment/application/use-cases/classify-deployment-services.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/classify-deployment-services.use-case.ts)
