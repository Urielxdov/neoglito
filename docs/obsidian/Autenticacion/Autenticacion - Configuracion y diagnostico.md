---
tags:
  - neoglito
  - autenticacion
  - documentacion-tecnica
funcionalidad: autenticacion
actualizado: 2026-10-10
---

# Autenticación · configuración y diagnóstico

## Variables y precedencia

| Variable | Requerimiento y lectura |
| --- | --- |
| GITHUB_CLIENT_ID | Obligatoria para iniciar e intercambiar OAuth |
| GITHUB_CLIENT_SECRET | Obligatoria al intercambiar code |
| GITHUB_CALLBACK_URL | Si tiene valor, prevalece como callback |
| BACKEND_URL | Fallback para formar callback; default http://localhost:3000; elimina un slash final |
| JWT_SECRET | Firma y validación; JwtStrategy falla si está ausente |
| ENCRYPTION_SECRET_KEY | Base64 de 32 bytes; servicio falla si falta o tamaño incorrecto |
| DATABASE_URL | Conexión Prisma/PostgreSQL |
| FRONTEND_URL | Redirección y origen CORS; default http://localhost:5174 |
| VITE_API_URL | Base de peticiones/navegación desde React; default http://localhost:3000 |
| NODE_ENV | Activa Secure de la cookie si vale production |

Sin GITHUB_CALLBACK_URL el helper devuelve `<BACKEND_URL>/auth/github/callback`. En el Compose incluido se inyecta un callback por defecto explícito; cambiar solo BACKEND_URL no necesariamente cambia el callback efectivo.

En la OAuth App, el callback debe coincidir con el que envía el backend. Usa los valores de ejemplo de `.env.example`; esta documentación no copia credenciales reales.

## Comprobación manual propuesta

Esta lista no se ejecutó durante la redacción.

1. Iniciar el entorno y verificar `/auth/github`: 302 con client_id, redirect_uri y scope previstos.
2. Autorizar una cuenta: comprobar callback 302, cookie HttpOnly y regreso al frontend.
3. Consultar `/auth/me`: 200 con id local y username, sin tokens en el JSON.
4. Inspeccionar Prisma: una conexión con githubId y userId únicos, y accessToken con formato `v1...`.
5. Autenticarse de nuevo con la misma cuenta: mismos IDs, perfil/tokens actualizados, sin otro User creado.
6. Quitar credenciales de una petición a `/auth/me`: comprobar 401.
7. Probar JWT expirado o alterado: comprobar 401.
8. Revisar que una falla de red hacia `/auth/me` se representa como unauthenticated en la UI actual.

## Diagnóstico

| Síntoma | Punto de revisión |
| --- | --- |
| Inicio OAuth responde 500 | Client ID configurado |
| Callback falla al intercambiar code | Secret, callback y respuesta del proveedor; no hay chequeo response.ok en intercambio |
| Perfil devuelve 502 | GetGitHubUserUseCase y token GitHub recibido |
| Login persiste pero no crea sesión | JWT_SECRET y firma posterior al upsert |
| /auth/me responde 401 | Cookie/Bearer, expiración, firma y prioridad de cookie |
| UI vuelve a login con API inaccesible | AuthProvider trata errores de red como unauthenticated |
| Token almacenado no se descifra | Clave original de cifrado y formato v1 |
| /auth/me funciona pero GitHub falla | JWT local válido no garantiza token GitHub válido |

## Límites observados en esta funcionalidad

- No se genera ni valida `state` OAuth en el controlador revisado.
- No hay manejo explícito de rechazo de OAuth ni validación runtime del query code.
- La respuesta del intercambio se afirma como tipo TypeScript sin validar HTTP/estructura.
- Se almacenan refresh token/vencimientos, pero no hay renovación automática ni endpoint refresh.
- No hay logout, borrado de cookie, lista de revocación o comprobación de existencia de usuario dentro de JwtStrategy.validate.
- El scope solicitado no incluye `repo`; no se debe prometer acceso a repositorios privados a partir de este login.
- Las respuestas de error genéricas pueden incluir exception.message mediante el filtro global.

Son hechos del código que ayudan a implementar y depurar la funcionalidad. No constituyen cambios realizados ni requisitos nuevos aprobados. Si se modifica el comportamiento, deben actualizarse [[Autenticacion - Flujo]], [[Autenticacion - Endpoints]] y [[Autenticacion - JWT cookie y cifrado]].

## Fuentes del código

- [src/auth/application/github-oauth.config.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/application/github-oauth.config.ts)
- [src/auth/application/exchange_github_code.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/application/exchange_github_code.ts)
- [src/auth/presentation/authentication.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/presentation/authentication.controller.ts)
- [src/auth/infrastructure/passport/jwt.strategy.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/infrastructure/passport/jwt.strategy.ts)
- [src/shared/presentation/filters/api-exception.filter.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/filters/api-exception.filter.ts)
- [apps/web/src/features/auth/auth-context.tsx](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/auth/auth-context.tsx)
- [.env.example](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/.env.example)
- [docker-compose.yml](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/docker-compose.yml)
