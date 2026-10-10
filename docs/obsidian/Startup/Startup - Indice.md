---
tags:
  - neoglito
  - startup
  - documentacion-tecnica
funcionalidad: startup
actualizado: 2026-10-10
---

# Startup · documentación técnica

`src/startup` contiene la recuperación automática de reservas de puertos al iniciar el backend. Su objetivo es reconstruir en Redis la relación puerto–propietario registrada en PostgreSQL, antes de aceptar peticiones HTTP. Esta documentación incluye el arranque general que ejecuta esa recuperación.

Inferido del código revisado el **10 de octubre de 2026**. Los ejemplos ilustran contratos y estados; no proceden de una ejecución contra Docker, PostgreSQL o Redis activos.

## Recorrido de lectura

1. [[Startup - Flujo]]: orden del arranque y condiciones para escuchar HTTP.
2. [[Startup - Implementacion y contratos]]: servicio, inyección, hooks y parámetros internos.
3. [[Startup - ORM y Redis]]: consulta Prisma, modelo y restauración atómica.
4. [[Startup - Uso configuracion y diagnostico]]: ejecución, variables, rutas relacionadas y fallos.

## Alcance

La recuperación se ejecuta una vez por inicialización de la aplicación Nest. No es un endpoint, una tarea periódica ni un proceso que arranque contenedores de proyectos. Reiniciar el proceso del backend vuelve a ejecutarla.

El servicio usa el estado persistido de `DeploymentService`; no consulta Docker para confirmar cada contenedor. La comprobación inicial de Docker verifica la disponibilidad de su daemon, que es una responsabilidad distinta.

## Fuentes del código

- [src/startup/restore-deployment-port-reservations.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/startup/restore-deployment-port-reservations.service.ts)
- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
- [src/app.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/app.module.ts)
