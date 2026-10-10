---
tags:
  - neoglito
  - autenticacion
  - documentacion-tecnica
funcionalidad: autenticacion
actualizado: 2026-10-10
---

# Autenticación · implementación backend

## Composición del módulo

`AuthModule` importa PrismaModule, Passport sin sesiones de servidor (`session: false`) y JwtModule con `expiresIn: '1h'` y JWT_SECRET. Registra AuthController, cuatro casos de uso, estrategia y guard JWT, y enlaza `ENCRYPTION_PORT` con `Aes256GcmEncryptionService`. Exporta JwtModule, PassportModule y JwtAuthGuard para otros módulos.

| Componente | Entrada | Resultado / responsabilidad |
| --- | --- | --- |
| `ExchangeGithubCodeUseCase.execute` | `code: string` | Intercambio HTTP y mapeo a GitHubAccessToken |
| `GetGitHubUserUseCase.execute` | token GitHub en texto | Consulta perfil y construye GitHubUserProfile |
| `AuthenticateWithGitHubUseCase.execute` | `{ token, profile }` | Cifrado, upsert Prisma y entidades de dominio |
| `AuthUseCase.execute` | `{ id, username }` | `{ accessToken }` con JWT local |
| `JwtStrategy.validate` | claims `{ sub, username }` | `{ id: sub, username }` para request.user |

AuthController coordina la secuencia; los casos de uso de intercambio y perfil acceden directamente a GitHub mediante `fetch`. AuthenticateWithGitHubUseCase usa PrismaService directamente. No existe un repositorio específico de autenticación que encapsule ese upsert.

## Contratos del proveedor y mapeos

`ExchangeGithubCodeUseCase` envía JSON a `https://github.com/login/oauth/access_token`:

```json
{
  "client_id": "<configurado en el backend>",
  "client_secret": "<configurado en el backend>",
  "code": "<recibido en el callback>",
  "redirect_uri": "<callback configurado>"
}
```

Usa `Accept: application/json` y `Content-Type: application/json`.

| JSON GitHub | Campo interno |
| --- | --- |
| access_token | accessToken |
| expires_in | expiresIn, opcional |
| refresh_token | refreshToken, opcional |
| refresh_token_expires_in | refreshTokenExpiresIn, opcional |
| token_type | tokenType |
| scope | scope |

`GetGitHubUserUseCase` consulta `https://api.github.com/user` con `Authorization: Bearer <token GitHub>` y `Accept: application/vnd.github+json`. Mapea `id` a `String(id)`, `login` a username, `avatar_url` a avatarUrl y `name ?? login` a name. Un name vacío se conserva porque el fallback usa `??`.

Los tipos de las respuestas se afirman con `as`; no hay validación de estructura en runtime en estos dos casos de uso. El perfil comprueba `response.ok`; el intercambio de código no lo comprueba.

## Entidades y respuesta pública

Se construyen User y GitHubConnection desde la persistencia. La instancia GitHubConnection devuelta al controlador contiene el token recién recibido en texto, aunque PostgreSQL guarda el cifrado. El controlador utiliza su username para emitir el JWT y no devuelve esa entidad en HTTP.

`AuthenticatedUserResponse`, definido en `packages/shared`, contiene solamente `id: number` y `username: string`. `/auth/me` no devuelve nombre de perfil, avatar ni credenciales.

Relacionadas: [[Autenticacion - ORM y persistencia]], [[Autenticacion - Endpoints]], [[Autenticacion - Configuracion y diagnostico]].

## Fuentes del código

- [src/auth/auth.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/auth.module.ts)
- [src/auth/application/exchange_github_code.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/application/exchange_github_code.ts)
- [src/auth/application/get_github_user.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/application/get_github_user.ts)
- [src/auth/application/authenticate_with_github.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/application/authenticate_with_github.ts)
- [src/auth/application/auth.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/application/auth.use-case.ts)
- [src/auth/domain/entities/GitHubConnection.entity.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/domain/entities/GitHubConnection.entity.ts)
- [packages/shared/src/auth/authenticated-user.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/packages/shared/src/auth/authenticated-user.response.ts)
