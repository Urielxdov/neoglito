---
tags:
  - neoglito
  - project
  - documentacion-tecnica
funcionalidad: Project
actualizado: 2026-10-10
---

# Project · documentación técnica

`ProjectModule` administra el nombre, descripción y consulta de proyectos. Cada proyecto agrupa repositorios y despliegues. El registro de repositorios, el análisis Compose y la ejecución Docker tienen implementaciones en otros módulos, aunque el frontend los presenta como un recorrido continuo.

Documentación inferida del código revisado el **10 de octubre de 2026**. No se ejecutaron peticiones, clones, migraciones ni pruebas de la aplicación para redactarla.

## Recorrido

1. [[Project - Flujo]]: creación, consulta, edición e inicialización desde la interfaz.
2. [[Project - Implementacion y contratos]]: módulos, entidades, inyección y casos de uso.
3. [[Project - ORM y relaciones]]: Prisma, consultas, relaciones y migraciones.
4. [[Project - Endpoints]]: rutas, parámetros, respuestas, autenticación y errores.
5. [[Project - Repositorios e inicializacion]]: vinculación, descubrimiento Compose y fallos parciales.
6. [[Project - Uso y frontend]]: hooks, estado, caché y validación.
7. [[Project - Diagnostico y pruebas]]: límites actuales, casos ilustrativos y verificación.

## Lectura esencial

La creación `POST /project/registry` es pública. El listado y la edición exigen JWT, pero no filtran ni verifican pertenencia por usuario: el modelo Project no tiene `userId`. El nombre es único globalmente. La actualización utiliza POST y responde **201** por defecto, aunque Swagger documenta 200.

[[Autenticacion - Indice]], [[Analisis - Indice]], [[Deployment - Indice]] y [[Ports - Indice]] desarrollan los módulos que intervienen después del registro del proyecto.

## Fuentes del código

- [src/project/project.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/project/project.module.ts)
- [src/project/presentation/project.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/project/presentation/project.controller.ts)
- [prisma/models/project.prisma](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/prisma/models/project.prisma)
