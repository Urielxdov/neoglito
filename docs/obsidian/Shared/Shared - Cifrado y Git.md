---
tags:
  - neoglito
  - shared
  - documentacion-tecnica
funcionalidad: Shared
actualizado: 2026-10-10
---

# Shared · cifrado y Git

## AES-256-GCM

Aes256GcmEncryptionService implementa EncryptionPort. El constructor exige ENCRYPTION_SECRET_KEY Base64 que decodifique a 32 bytes. Una clave ausente o de otra longitud provoca Error al construir el proveedor.

encrypt genera IV aleatorio de 12 bytes, cifra texto UTF-8 con AES-256-GCM y obtiene tag de autenticación de 16 bytes. Devuelve `v1.iv.tag.ciphertext`, con los tres componentes binarios en Base64URL. No escribe en base de datos: el consumidor persiste ese string.

decrypt separa componentes, exige versión v1, IV y tag presentes, sin segmentos adicionales. Decodifica buffers y verifica longitudes de IV/tag. Luego configura el tag y descifra. Errores de formato usan “Invalid encrypted payload format”; fallos criptográficos dentro del try usan “Unable to decrypt payload”.

No hay rotación, identificador de clave, migración de versiones ni búsqueda de claves antiguas. Cambiar la clave sin transformar los payloads existentes puede impedir recuperar credenciales. El cifrado protege y autentica el contenido almacenado; no equivale al JWT que autentica requests HTTP.

AuthModule lo usa para guardar tokens GitHub; RepositoryModule lo usa para leerlos al listar o clonar. Consultar [[Autenticacion - JWT cookie y cifrado]] y [[Repository - GitHub y credenciales]].

## Adaptador Git

GitCloneRepositoryService implementa clone(cloneUrl, username, accessToken, destination). Su responsabilidad comienza con argumentos ya resueltos: no consulta Prisma, valida host ni decide si reutilizar el destino. Esas decisiones están en CloneRepositoryUseCase.

El pipeline crea un temporal github-clone- en tmpdir, escribe askpass.sh, crea el padre del destino, ejecuta Git y elimina el temporal en finally. El script responde a prompts Username/Password imprimiendo variables del entorno del hijo. No incluye literalmente el token en el archivo.

spawn ejecuta `git` con array `[clone, cloneUrl, destination]`, sin shell, con stdin/stdout ignorados y stderr capturado. Hereda process.env y agrega GIT_ASKPASS, GIT_USERNAME, GIT_PASSWORD y GIT_TERMINAL_PROMPT=0. Código 0 resuelve; otros códigos lanzan InternalServerErrorException con stderr. Un evento error produce “No fue posible ejecutar Git”.

No implementa timeout, cancelación, progreso, retry, límites de stderr, fetch/pull, branch, shallow clone o limpieza del destino fallido. El finally limpia solo el helper temporal; un fallo de esa limpieza puede propagarse. Tampoco configura windowsHide ni una variante de ASKPASS para otra shell.

El uso concreto puede reutilizar una carpeta existente sin llamar al adaptador. El destino usa username y nombre corto; los choques, URLs admitidas y fallos parciales están desarrollados en [[Repository - Clonacion paso a paso]].

## Persistencia y exposición

Shared no almacena credenciales por sí mismo. Los tokens cifrados pertenecen a GitHubConnection. Los clones son archivos locales y no tienen un estado persistido en Repository. El filtro HTTP puede devolver mensajes de Error y stderr tal como se construyen; estas clases no aplican redacción global de secretos a mensajes.

Volver a [[Shared - Indice]].

## Fuentes del código

- [src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts)
- [src/shared/application/encryption.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/encryption.port.ts)
- [src/shared/infrastructure/git/git-repository-cloner.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/git/git-repository-cloner.service.ts)
- [src/shared/application/repository-cloner.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/repository-cloner.port.ts)
- [src/auth/auth.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/auth.module.ts)
- [src/repository/repository.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/repository.module.ts)
