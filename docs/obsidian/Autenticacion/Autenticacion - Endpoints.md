---
tags:
  - neoglito
  - autenticacion
  - documentacion-tecnica
funcionalidad: autenticacion
actualizado: 2026-10-10
---

# Autenticación · endpoints

Base local: `http://localhost:3000`. Los tres endpoints están en AuthController bajo `/auth`. Los ejemplos muestran contratos inferidos del código, no respuestas capturadas de una ejecución.

| Método y ruta | Autenticación previa | Parámetros de entrada | Éxito |
| --- | --- | --- | --- |
| GET /auth/github | No | Ninguno | 302 a GitHub |
| GET /auth/github/callback | No | Query code | 302 al frontend y cookie |
| GET /auth/me | JWT local | Cookie o Authorization | 200 con identidad |

## GET /auth/github

Uso: navegar desde el navegador para iniciar OAuth. No tiene body, parámetros de ruta ni query leída por el handler. El cliente no envía secretos ni selecciona scopes.

El servidor construye `https://github.com/login/oauth/authorize` con:

| Parámetro enviado a GitHub | Origen |
| --- | --- |
| client_id | GITHUB_CLIENT_ID |
| redirect_uri | getGitHubCallbackUrl() |
| scope | Literal `read:user user:email` |

Devuelve 302 y header Location. No devuelve JSON `success/data` ni crea la sesión local todavía. Si falta GITHUB_CLIENT_ID, el helper lanza Error y el filtro responde 500.

Ejemplo de navegación: `http://localhost:3000/auth/github`.

## GET /auth/github/callback

| Entrada | Ubicación | Tipo esperado | Validación implementada |
| --- | --- | --- | --- |
| code | Query | string | Swagger lo marca requerido; no hay pipe, DTO o comprobación explícita de ausencia |

No requiere un JWT existente ni recibe body. GitHub debe redirigir a este endpoint; no se utiliza como formulario de login manual.

Ejemplo ilustrativo: `/auth/github/callback?code=<codigo-emitido-por-GitHub>`.

Intercambia code, obtiene perfil, persiste usuario/conexión, firma JWT y agrega:

- `Location`: FRONTEND_URL o `http://localhost:5174`.
- `Set-Cookie`: access_token con JWT, HttpOnly, SameSite=Lax, Path=/, duración de una hora; Secure en producción.

Devuelve 302 sin el envoltorio JSON. El JWT se entrega en cookie; no se incluye como campo de una respuesta JSON ni en la URL al frontend.

### Errores del callback

| Condición | Comportamiento observable en código |
| --- | --- |
| Perfil GitHub con response.ok false | 502, `No fue posible obtener el perfil de GitHub` |
| user.id undefined después de persistir | 401, `No fue posible autenticar al usuario` |
| Variables requeridas ausentes | Error genérico convertido a 500 |
| Fetch, JSON, Prisma, cifrado o firma fallan | Sin manejo específico en el callback; filtro global |
| code ausente/inválido o GitHub devuelve error de intercambio | No hay comprobación dedicada; la respuesta se mapea y el fallo puede aparecer en una etapa posterior |
| Usuario deniega OAuth y llega query error | El controlador no tiene una rama para error/error_description |

Swagger anuncia un 401, pero no describe todas las rutas reales de error. No hay una redirección a una pantalla de error frontend implementada en este handler.

## GET /auth/me

No tiene body, query ni parámetros de ruta. Usa JwtAuthGuard.

| Entrada | Forma | Uso |
| --- | --- | --- |
| Cookie | `access_token=<JWT de Neoglito>` | Navegador; primera fuente de extracción |
| Authorization | `Bearer <JWT de Neoglito>` | Alternativa para clientes HTTP |

Respuesta 200 ilustrativa:

```json
{
  "success": true,
  "data": { "id": 1, "username": "usuario-demo" },
  "error": null,
  "meta": null
}
```

El ID es local. No devuelve datos consultados de User/GitHubConnection: devuelve request.user construido desde el JWT. Una credencial ausente, expirada o con firma inválida produce 401 por el guard.

Ejemplo de error normalizado:

```json
{
  "success": false,
  "data": null,
  "error": { "code": "Unauthorized", "message": "Unauthorized" },
  "meta": null
}
```

La cookie tiene prioridad. Si contiene un JWT inválido, no se debe esperar que un Bearer válido compense esa cookie: el extractor selecciona el primer token encontrado.

Relacionadas: [[Autenticacion - Flujo]], [[Autenticacion - JWT cookie y cifrado]], [[Autenticacion - Uso y frontend]].

## Fuentes del código

- [src/auth/presentation/authentication.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/presentation/authentication.controller.ts)
- [src/auth/application/github-oauth.config.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/application/github-oauth.config.ts)
- [src/auth/application/exchange_github_code.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/application/exchange_github_code.ts)
- [src/auth/application/get_github_user.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/application/get_github_user.ts)
- [src/auth/infrastructure/passport/jwt.strategy.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/infrastructure/passport/jwt.strategy.ts)
- [src/shared/presentation/interceptors/api-response.interceptor.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/interceptors/api-response.interceptor.ts)
- [src/shared/presentation/filters/api-exception.filter.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/filters/api-exception.filter.ts)
