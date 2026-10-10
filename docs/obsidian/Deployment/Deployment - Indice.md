---
tags:
  - neoglito
  - deployment
  - documentacion-tecnica
funcionalidad: deployment
actualizado: 2026-10-10
---

# Deployment · documentación técnica

`DeploymentModule` coordina el despliegue de un archivo Compose perteneciente a un proyecto: prepara un YAML independiente, reserva puertos, ejecuta Docker, persiste contenedores y permite consultar, clasificar y detener el despliegue.

Documentación inferida del código revisado el **10 de octubre de 2026**. Los ejemplos ilustran los contratos actuales; no se realizaron despliegues para redactarla.

## Recorrido

1. [[Deployment - Flujo y estados]]: creación, fallos, parada y clasificación.
2. [[Deployment - Implementacion y contratos]]: módulos, inyección, entidades y contratos internos.
3. [[Deployment - Preparacion Compose]]: YAML generado, variables, puertos, rutas y aislamiento.
4. [[Deployment - Modo espejo]]: adaptación de listeners y URLs.
5. [[Deployment - ORM y reservas]]: Prisma, Redis y consistencia.
6. [[Deployment - Endpoints]]: rutas, parámetros, respuestas y errores.
7. [[Deployment - Uso y frontend]]: consumo HTTP y comportamiento de la interfaz.
8. [[Deployment - Configuracion diagnostico y pruebas]]: configuración, límites y pruebas existentes.

## Módulos relacionados

- [[Analisis - Indice]] descubre los archivos Compose de los repositorios del proyecto.
- [[Container - Indice]] ejecuta Compose e inspecciona contenedores.
- [[Startup - Indice]] reconstruye reservas desde servicios persistidos al arrancar.
- [[Autenticacion - Indice]] aporta el JWT que protege los controladores.

El módulo de puertos proporciona reservas y clasificación. Parte del catálogo de tipos, imágenes y protocolos está alojada en el dominio de deployment, aunque la cadena clasificadora se implementa en `src/ports`.

## Fuentes del código

- [src/deployment/deployment.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/deployment.module.ts)
- [src/deployment/presentation/deployment.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/presentation/deployment.controller.ts)
