---
tags:
  - neoglito
  - repository
  - documentacion-tecnica
funcionalidad: Repository
actualizado: 2026-10-10
---

# Repository · GitHub y credenciales

## Identidad y conexión

GET /repository/all y POST /repository/clone reciben userId de request.user.id después de JwtAuthGuard. Consultan `prisma.gitHubConnection.findUnique({where:{userId}})`. Si falta conexión, lanzan 404 con “El usuario no tiene una conexión de GitHub”.

GitHubConnection guarda username, githubId y accessToken cifrado, junto con campos opcionales de refresh y expiración. Estos casos de uso no revisan esos timestamps ni ejecutan renovación de tokens. La autenticación OAuth que crea la conexión se documenta en [[Autenticacion - Flujo]].

## Consulta remota exacta

GetRepositoriesUseCase descifra accessToken y ejecuta fetch a `https://api.github.com/user/repos?per_page=100` con method GET, Authorization Bearer y Accept application/vnd.github+json.

El código no añade page, filtros de visibilidad, sort, afiliación, cabecera de versión, timeout ni reintentos propios. No sigue Link para recuperar páginas siguientes. La respuesta visible puede ser incompleta si la cuenta tiene más resultados. No hay una segunda consulta para organizaciones ni combinación con registros locales.

Un response.ok falso se traduce a BadGatewayException con mensaje genérico. No expone el status original de GitHub como status del endpoint ni diferencia credenciales revocadas, permisos, rate limit o fallos remotos. Si fetch rechaza, falla el JSON o su forma no permite map, no hay catch específico: el filtro global puede devolver 500.

## Mapeo de respuesta

| GitHub | RepositoryResponse |
|---|---|
| id | id |
| full_name | name, normalmente owner/repo |
| private | private |
| description | description; null/undefined → Sin descripción |
| language | language; null/undefined → Sin lenguaje |
| git_url | gitUrl |
| clone_url | cloneUrl |
| updated_at | updatedAt |

El campo name corto del JSON no se usa en la respuesta. gitUrl proviene de git_url, no de html_url. La clonación usa cloneUrl. La consulta no persiste estos valores: se guardan cuando el frontend llama al registro.

## Cifrado y uso del token

RepositoryModule registra Aes256GcmEncryptionService mediante ENCRYPTION_PORT. Su constructor exige `ENCRYPTION_SECRET_KEY` Base64 que decodifique a 32 bytes. Usa AES-256-GCM, IV de 12 bytes y tag de 16 bytes; el payload tiene forma `v1.iv.tag.ciphertext` con componentes Base64URL.

GetRepositoriesUseCase descifra para cada ejecución. CloneRepositoryUseCase descifra solo si el destino no existe. Un token ilegible puede afectar al listado pero pasar inadvertido al reutilizar una carpeta local. El servicio de cifrado se instancia al arrancar: una clave faltante o de longitud incorrecta impide inicializar el proveedor, aunque una ruta concreta no necesite descifrar.

El adaptador Git recibe el token en memoria y lo transmite al entorno del proceso hijo. El código no concatena ese token a cloneUrl ni lo escribe dentro del script ASKPASS. Las respuestas públicas no incluyen credenciales; pathSystem devuelve una ruta del backend. Consultar [[Repository - Clonacion paso a paso]] para el mecanismo concreto y [[Autenticacion - JWT cookie y cifrado]] para el contexto de sesión.

Volver a [[Repository - Indice]].

## Fuentes del código

- [src/repository/application/use-cases/repository/get-repositories.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/get-repositories.use-case.ts)
- [src/repository/application/use-cases/repository/clone-repository.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/clone-repository.use-case.ts)
- [src/repository/infrastructure/github/github-repository.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/infrastructure/github/github-repository.response.ts)
- [prisma/models/github-connection.prisma](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/prisma/models/github-connection.prisma)
- [src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts)
- [src/shared/infrastructure/git/git-repository-cloner.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/git/git-repository-cloner.service.ts)
