---
tags:
  - neoglito
  - autenticacion
  - documentacion-tecnica
funcionalidad: autenticacion
actualizado: 2026-10-10
---

# Autenticación · JWT, cookie y cifrado

## Credenciales diferentes

| Credencial | Emisor | Destino / almacenamiento | Uso |
| --- | --- | --- | --- |
| Token GitHub | GitHub | Cifrado en GitHubConnection.accessToken | API GitHub y clonado |
| Refresh token GitHub, si llega | GitHub | Cifrado en refreshToken | Se conserva; no hay renovación implementada |
| JWT Neoglito | AuthUseCase/JwtService | Cookie access_token del navegador | Endpoints con JwtAuthGuard |

La duración del JWT no deriva de los vencimientos GitHub. JwtModule firma con JWT_SECRET y expiración fija `1h`. El caso de uso aporta `sub: user.id` y username; la biblioteca agrega los claims temporales al firmar.

## Cookie de sesión

| Opción del controlador | Valor |
| --- | --- |
| Nombre | access_token |
| httpOnly | true |
| secure | NODE_ENV === 'production' |
| sameSite | lax |
| maxAge | 3600000 ms |
| path | / |
| domain | No configurado explícitamente |

El frontend no necesita leer el JWT desde JavaScript; fetch envía la cookie con `credentials: 'include'`. CORS permite credenciales para el origen FRONTEND_URL. Para un despliegue con frontend/backend en sitios distintos, hay que revisar el efecto de SameSite y Secure; el código actual fija estas opciones y no ofrece variables para cambiarlas.

## Validación de peticiones

JwtAuthGuard extiende `AuthGuard('jwt')`. JwtStrategy usa primero un extractor manual de Cookie: divide por `;`, encuentra access_token y aplica decodeURIComponent. Después acepta Bearer como fuente alternativa si no obtuvo cookie.

Passport verifica firma/expiración con JWT_SECRET (`ignoreExpiration: false`). La función validate convierte `sub` en id y conserva username. No consulta Prisma, no comprueba que User siga existiendo, no compara con el perfil GitHub actualizado y no consulta una lista de revocación. El formato TypeScript de los claims no equivale a validación adicional en runtime.

## Cifrado en reposo

Aes256GcmEncryptionService exige ENCRYPTION_SECRET_KEY Base64 que decodifique a 32 bytes. Usa AES-256-GCM, IV aleatorio de 12 bytes y auth tag de 16 bytes. El formato es:

```text
v1.<iv-base64url>.<auth-tag-base64url>.<ciphertext-base64url>
```

decrypt valida versión, segmentos y tamaños de IV/tag. Si falla la autenticación del contenido lanza `Unable to decrypt payload`. Los tokens se descifran solo para su uso en los flujos revisados. Cambiar la clave impide descifrar valores anteriores; no se encontró una estrategia de rotación o migración de cifrado.

No se persiste el JWT local en estas tablas. No hay endpoint para borrar la cookie ni invalidar JWT emitidos individualmente.

Relacionadas: [[Autenticacion - ORM y persistencia]], [[Autenticacion - Configuracion y diagnostico]].

## Fuentes del código

- [src/auth/application/auth.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/application/auth.use-case.ts)
- [src/auth/auth.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/auth.module.ts)
- [src/auth/infrastructure/passport/jwt.strategy.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/infrastructure/passport/jwt.strategy.ts)
- [src/auth/infrastructure/passport/jwt-auth.guard.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/infrastructure/passport/jwt-auth.guard.ts)
- [src/auth/presentation/authentication.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/presentation/authentication.controller.ts)
- [src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts)
- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
