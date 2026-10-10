---
tags:
  - neoglito
  - autenticacion
  - documentacion-tecnica
funcionalidad: autenticacion
actualizado: 2026-10-10
---

# Autenticación · documentación técnica

La funcionalidad permite iniciar sesión mediante GitHub, crear o actualizar la identidad local y acceder a endpoints protegidos con un JWT de Neoglito. Documentación inferida del código revisado el **10 de octubre de 2026**; no se ejecutó OAuth ni se verificaron respuestas contra servicios activos.

## Recorrido de lectura

1. [[Autenticacion - Flujo]]: secuencia de inicio y recuperación de sesión.
2. [[Autenticacion - Implementacion backend]]: responsabilidades, dependencias y contratos internos.
3. [[Autenticacion - ORM y persistencia]]: modelos Prisma, restricciones y upsert.
4. [[Autenticacion - Endpoints]]: métodos, parámetros, respuestas y errores.
5. [[Autenticacion - JWT cookie y cifrado]]: credenciales, guard y almacenamiento.
6. [[Autenticacion - Uso y frontend]]: interacción del usuario, estado y consumo de la API.
7. [[Autenticacion - Configuracion y diagnostico]]: variables, validación manual y límites actuales.

## Vocabulario de esta funcionalidad

| Término | Significado en el código |
| --- | --- |
| `code` | Código que llega de GitHub al callback y se intercambia por un token |
| Token de GitHub | Credencial del proveedor para perfil, repositorios y clonado |
| JWT de Neoglito | Credencial local firmada con JWT_SECRET para endpoints protegidos |
| `access_token` | Nombre de la cookie local; contiene el JWT de Neoglito |
| `GitHubConnection.accessToken` | Token GitHub cifrado en PostgreSQL |
| `user.id` / `sub` | ID local de User |
| `githubId` | ID GitHub convertido a string; identifica el upsert |
| `username` | Login GitHub; distinto de User.name |

El inicio de sesión no recibe contraseñas locales. En la implementación revisada no hay endpoints de logout ni renovación de sesión. El refresh del contexto React vuelve a consultar `/auth/me`; no renueva credenciales.

## Alcance y mantenimiento

Las notas separan comportamiento implementado, ejemplos de contrato y límites observados. No añaden funciones al proyecto. Los enlaces de fuentes apuntan al código original; actualízalos si cambias su ubicación. Las demás funcionalidades conservan su documentación previa.

## Fuentes del código

- [src/auth/presentation/authentication.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/presentation/authentication.controller.ts)
- [src/auth/auth.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/auth.module.ts)
- [packages/shared/src/auth/authenticated-user.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/auth/authenticated-user.response.ts)
