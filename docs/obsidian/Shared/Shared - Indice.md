---
tags:
  - neoglito
  - shared
  - documentacion-tecnica
funcionalidad: Shared
actualizado: 2026-10-10
---

# Shared · documentación técnica

Shared reúne piezas transversales del proyecto. No hay un `SharedModule` único: el código está repartido entre backend, paquete de contratos y frontend, con responsabilidades y mecanismos de consumo distintos.

Documentación inferida del código revisado el **10 de octubre de 2026**. No se ejecutaron Redis, Git, peticiones HTTP, migraciones ni pruebas de aplicación para redactarla.

## Áreas

| Ruta | Responsabilidad | Consumidores |
|---|---|---|
| src/shared/application | Puertos y normalización de datos Compose | Casos de uso del backend |
| src/shared/infrastructure | Implementaciones Redis, archivos, YAML, Git y cifrado | Módulos que registran proveedores |
| src/shared/presentation | Envoltura HTTP, errores, request autenticado y Swagger | Bootstrap y controladores |
| packages/shared | Contratos TypeScript y normalización de texto | Backend y frontend |
| apps/web/src/shared | Cliente HTTP, contextos, tema, fechas e identidad visual | Features y layout web |

## Recorrido

1. [[Shared - Arquitectura y consumidores]]: registros de proveedores y alcance real.
2. [[Shared - Puertos y contratos internos]]: métodos, entradas y resultados.
3. [[Shared - Busqueda de archivos]]: comparación de los dos buscadores.
4. [[Shared - Extraccion Compose]]: variables, interpolación y normalización de puertos.
5. [[Shared - Redis y cache]]: conexión, ciclo de vida, operaciones y TTL.
6. [[Shared - Cifrado y Git]]: implementaciones y límites de responsabilidad.
7. [[Shared - HTTP errores y Swagger]]: flujo HTTP, envolturas y documentación.
8. [[Shared - Paquete de contratos]]: exports, requests y responses compartidos.
9. [[Shared - Cliente HTTP frontend]]: transporte, errores y consumo.
10. [[Shared - Estado utilidades y branding]]: contextos, tema, fechas, iconos y splash.
11. [[Shared - Diagnostico pruebas y extension]]: límites, pruebas existentes y mantenimiento.

Shared no posee controladores de negocio ni modelos Prisma propios. Redis y filesystem son persistencia utilizada por implementaciones compartidas; los modelos User, GitHubConnection, Project y Deployment pertenecen a los módulos funcionales. Los endpoints se explican en [[Autenticacion - Indice]], [[Project - Indice]], [[Repository - Indice]], [[Analisis - Indice]], [[Deployment - Indice]] y [[Ports - Indice]].

## Fuentes del código

- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
- [src/shared/infrastructure/cache/cache.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/cache/cache.module.ts)
- [packages/shared/package.json](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/package.json)
- [apps/web/src/shared/api/contracts.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/shared/api/contracts.ts)
