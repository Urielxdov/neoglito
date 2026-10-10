from pathlib import Path
import re

base = Path(__file__).resolve().parent
repo = base.parent.parent
out = base / 'Autenticacion'
out.mkdir(exist_ok=True)

notes = {
'Autenticacion - Indice': ('''# Autenticación · documentación técnica

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
''', ['src/auth/presentation/authentication.controller.ts', 'src/auth/auth.module.ts', 'packages/shared/src/auth/authenticated-user.response.ts']),
'Autenticacion - Flujo': ('''# Autenticación · flujo

## Inicio de sesión completo

```mermaid
sequenceDiagram
    participant N as Navegador / React
    participant A as AuthController
    participant G as GitHub
    participant P as Prisma / PostgreSQL
    N->>A: GET /auth/github (navegación)
    A-->>N: 302 Location hacia GitHub
    N->>G: Autorizar aplicación
    G-->>N: Redirección al callback con code
    N->>A: GET /auth/github/callback?code=...
    A->>G: POST /login/oauth/access_token
    G-->>A: Token y metadatos
    A->>G: GET /user con token GitHub
    G-->>A: Perfil GitHub
    A->>A: Cifrar tokens y calcular vencimientos
    A->>P: upsert GitHubConnection con User anidado
    P-->>A: Conexión y usuario local
    A->>A: Firmar JWT con sub y username
    A-->>N: 302 al frontend + Set-Cookie access_token
    N->>A: GET /auth/me con cookie
    A->>A: Guard valida JWT y construye request.user
    A-->>N: 200 con identidad en envoltorio API
```

El backend inicia OAuth con `scope=read:user user:email`. Consulta el perfil `/user`, pero no consulta un endpoint de correos ni almacena email en User. El intercambio del código incluye el mismo callback configurado.

Si no existe una conexión con ese `githubId`, se crea junto con un User. Si existe, se actualizan perfil y credenciales conservando el ID local. Después se firma un JWT de una hora y se establece la cookie. El navegador vuelve a `FRONTEND_URL` o a `http://localhost:5174`.

## Recuperar sesión al abrir la aplicación

`AuthProvider` comienza en `loading` y llama a `/auth/me`. Si obtiene `success: true` con datos, cambia a `authenticated`. Cualquier respuesta fallida produce `unauthenticated`, incluidos errores de red. `ProtectedRoute` muestra la espera durante loading o redirige a `/authentication` si falta sesión.

## Qué sucede después

Cada endpoint con `JwtAuthGuard` valida el JWT; no vuelve a ejecutar OAuth. El guard obtiene la identidad de sus claims. Listar repositorios y clonar sí consultan GitHubConnection por `userId` y descifran el token GitHub para operar con el proveedor.

El JWT y el token GitHub pueden dejar de ser válidos en momentos diferentes. Que `/auth/me` funcione no demuestra que una operación posterior con GitHub vaya a funcionar.

Relacionadas: [[Autenticacion - ORM y persistencia]], [[Autenticacion - JWT cookie y cifrado]], [[Autenticacion - Uso y frontend]].
''', ['src/auth/presentation/authentication.controller.ts', 'apps/web/src/features/auth/auth-context.tsx', 'src/repository/application/use-cases/repository/get-repositories.use-case.ts', 'src/repository/application/use-cases/repository/clone-repository.use-case.ts']),
'Autenticacion - Implementacion backend': ('''# Autenticación · implementación backend

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
''', ['src/auth/auth.module.ts', 'src/auth/application/exchange_github_code.ts', 'src/auth/application/get_github_user.ts', 'src/auth/application/authenticate_with_github.ts', 'src/auth/application/auth.use-case.ts', 'src/auth/domain/entities/GitHubConnection.entity.ts', 'packages/shared/src/auth/authenticated-user.response.ts']),
'Autenticacion - ORM y persistencia': ('''# Autenticación · ORM y persistencia

## Modelos Prisma

```mermaid
erDiagram
    User ||--o| GitHubConnection : vincula
    User {
        Int id PK
        String name
        DateTime createdAt
    }
    GitHubConnection {
        Int id PK
        Int userId FK,UK
        String githubId UK
        String username
        String avatarUrl
        String accessToken
        String refreshToken
        DateTime accessTokenExpiresAt
        DateTime refreshTokenExpiresAt
    }
```

| Campo | Tipo / nulabilidad | Regla y significado |
| --- | --- | --- |
| User.id | Int requerido | PK autoincremental; identidad local |
| User.name | String requerido | Nombre GitHub o login como fallback |
| User.createdAt | DateTime requerido | Default now() |
| User.githubConnection | GitHubConnection opcional | Un usuario puede existir sin conexión |
| GitHubConnection.id | Int requerido | PK autoincremental |
| userId | Int requerido, único | FK User.id; una conexión por usuario |
| githubId | String requerido, único | Identidad estable GitHub y clave de upsert |
| username / avatarUrl | String requerido | Perfil sincronizado en cada login |
| accessToken | String requerido | Token GitHub cifrado |
| refreshToken | String nullable | Refresh token GitHub cifrado si se recibe |
| accessTokenExpiresAt | DateTime nullable | Vencimiento calculado o null |
| refreshTokenExpiresAt | DateTime nullable | Vencimiento calculado o null |

La conexión exige User y declara `onDelete: Cascade`. Borrar el usuario elimina su conexión. Borrar la conexión no implica borrar el usuario. La migración `20260923211500_add_auth_models` crea ambas tablas, índices únicos y FK con cascada de eliminación y actualización.

## Upsert durante el callback

Primero se cifran accessToken y refreshToken, si llega este último. Después se realiza una sola llamada Prisma:

```typescript
prisma.gitHubConnection.upsert({
  where: { githubId: profile.githubId },
  create: { /* conexión y user.create */ },
  update: { /* conexión y user.update */ },
  include: { user: true },
})
```

Es un upsert con escrituras anidadas; no hay una transacción manual separada en el caso de uso.

| Dato | Primera autenticación | Nueva autenticación |
| --- | --- | --- |
| User | Crea name; id/createdAt por defecto | Actualiza name; conserva id/createdAt |
| githubId | Inserta clave única | Se utiliza para localizar, no se actualiza |
| username, avatarUrl | Inserta | Reemplaza con perfil nuevo |
| accessToken | Inserta cifrado | Reemplaza cifrado |
| accessTokenExpiresAt | Calcula o null | Calcula o null; puede borrar vencimiento anterior |
| refreshToken | Cifrado o null | Solo actualiza si llega un valor truthy; de lo contrario conserva el anterior |
| refreshTokenExpiresAt | Calcula o null | Solo actualiza si refreshTokenExpiresIn no es undefined |

El vencimiento usa `new Date(Date.now() + expiresIn * 1000)`. Sin duración devuelve null; cero segundos produce una fecha correspondiente al momento del cálculo.

## Lecturas posteriores

`/auth/me` no consulta estas tablas: devuelve claims validados del JWT. Repositorios y clonado consultan `gitHubConnection.findUnique({ where: { userId } })` y descifran accessToken. Las fechas almacenadas no se usan para renovar tokens automáticamente en los flujos revisados.

La conexión ORM usa PostgreSQL con `PrismaPg` y DATABASE_URL. La configuración `prisma7.config.ts` apunta a la carpeta `prisma`, donde los modelos se separan en archivos.

Relacionadas: [[Autenticacion - Implementacion backend]], [[Autenticacion - JWT cookie y cifrado]].
''', ['prisma/models/user.prisma', 'prisma/models/github-connection.prisma', 'prisma/migrations/20260923211500_add_auth_models/migration.sql', 'src/auth/application/authenticate_with_github.ts', 'src/prisma/prisma.service.ts', 'prisma7.config.ts']),
'Autenticacion - Endpoints': ('''# Autenticación · endpoints

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
''', ['src/auth/presentation/authentication.controller.ts', 'src/auth/application/github-oauth.config.ts', 'src/auth/application/exchange_github_code.ts', 'src/auth/application/get_github_user.ts', 'src/auth/infrastructure/passport/jwt.strategy.ts', 'src/shared/presentation/interceptors/api-response.interceptor.ts', 'src/shared/presentation/filters/api-exception.filter.ts']),
'Autenticacion - JWT cookie y cifrado': ('''# Autenticación · JWT, cookie y cifrado

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
''', ['src/auth/application/auth.use-case.ts', 'src/auth/auth.module.ts', 'src/auth/infrastructure/passport/jwt.strategy.ts', 'src/auth/infrastructure/passport/jwt-auth.guard.ts', 'src/auth/presentation/authentication.controller.ts', 'src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts', 'src/main.ts']),
'Autenticacion - Uso y frontend': ('''# Autenticación · uso y frontend

## Interacción del usuario

1. Abrir el frontend en `http://localhost:5174`.
2. Si no hay sesión, ProtectedRoute redirige a `/authentication`.
3. La acción GitHub establece un mensaje de espera y ejecuta `authService.connectWithGitHub()`.
4. `window.location.assign()` navega a la API `/auth/github`; la autorización ocurre en GitHub.
5. El callback instala la cookie y devuelve al frontend.
6. AuthProvider consulta `/auth/me` al montarse y habilita la vista protegida si obtiene identidad.

El callback vuelve a FRONTEND_URL. Aunque ProtectedRoute guarda la ubicación previa en `state.from`, el flujo revisado no la usa para reconstruir el destino después de OAuth.

## Componentes y estado

| Pieza | Función |
| --- | --- |
| AuthenticationPage | Coordina acciones y mensajes del panel |
| GitHubConnectionPanel | Presentación de conexión |
| authService.getGitHubConnectionUrl | Construye URL usando VITE_API_URL sin slash final |
| authService.connectWithGitHub | Navegación completa a OAuth |
| authService.getCurrentUser | GET /auth/me mediante apiClient |
| AuthProvider | Contexto, reducer y comprobación inicial |
| useAuth | Acceso al contexto; lanza Error fuera del provider |
| ProtectedRoute | Espera, redirección o Outlet |

Estado inicial: `{ status: 'loading', user: null }`. Las acciones del reducer son authenticated con usuario y unauthenticated sin usuario. `refresh()` del contexto consulta identidad; no llama a un endpoint de renovación ni cambia el estado a loading antes de consultar nuevamente.

AuthenticationPage también tiene una acción primaria que muestra `Sincronización activa`; ese handler solo actualiza el mensaje local. El botón cancelar limpia el mensaje local; no cierra sesión ni revoca GitHub.

## Consumir identidad desde otro componente

Patrón compatible con el contexto existente, dentro de AuthProvider:

```tsx
const { status, user, refresh } = useAuth()
// user?.id es el ID local; user?.username es el login GitHub.
// refresh() vuelve a consultar identidad, no renueva el JWT.
```

## Consumir la API desde un cliente HTTP

Para OAuth, inicia la navegación en un navegador. Un fetch aislado no reemplaza el recorrido de redirecciones e interacción del usuario.

Para comprobar una sesión existente desde el frontend:

```typescript
const response = await fetch('http://localhost:3000/auth/me', {
  credentials: 'include',
  headers: { Accept: 'application/json' },
})
const result = await response.json()
```

Para un cliente que ya disponga de un JWT local, puede enviar `Authorization: Bearer <JWT de Neoglito>`. El callback público no devuelve un JWT en JSON. Un token de GitHub no reemplaza al JWT de Neoglito para `/auth/me`.

apiClient exige el formato API estándar y convierte errores de red en NETWORK_ERROR y formatos no reconocidos en INVALID_API_RESPONSE. AuthProvider considera ambos casos una sesión no autenticada; no conserva un estado diferenciado de fallo de conectividad.

Relacionadas: [[Autenticacion - Endpoints]], [[Autenticacion - Configuracion y diagnostico]].
''', ['apps/web/src/pages/authentication-page.tsx', 'apps/web/src/features/auth/auth.service.ts', 'apps/web/src/features/auth/auth-context.tsx', 'apps/web/src/features/auth/auth.reducer.ts', 'apps/web/src/features/auth/use-auth.ts', 'apps/web/src/app/protected-route.tsx', 'apps/web/src/shared/api/client.ts']),
'Autenticacion - Configuracion y diagnostico': ('''# Autenticación · configuración y diagnóstico

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
''', ['src/auth/application/github-oauth.config.ts', 'src/auth/application/exchange_github_code.ts', 'src/auth/presentation/authentication.controller.ts', 'src/auth/infrastructure/passport/jwt.strategy.ts', 'src/shared/presentation/filters/api-exception.filter.ts', 'apps/web/src/features/auth/auth-context.tsx', '.env.example', 'docker-compose.yml'])
}

for title, (body, sources) in notes.items():
    for link in re.findall(r'\[\[([^\]]+)\]\]', body):
        assert link in notes, (title, link)
    footer = '\n## Fuentes del código\n\n'
    for source in sources:
        file = repo / source
        assert file.is_file(), source
        footer += f'- [{source}]({file.as_uri()})\n'
    metadata = '---\ntags:\n  - neoglito\n  - autenticacion\n  - documentacion-tecnica\nfuncionalidad: autenticacion\nactualizado: 2026-10-10\n---\n\n'
    (out / f'{title}.md').write_text(metadata + body.strip() + '\n' + footer, encoding='utf-8')
print(f'{len(notes)} notas de autenticación; referencias internas y fuentes verificadas.')
