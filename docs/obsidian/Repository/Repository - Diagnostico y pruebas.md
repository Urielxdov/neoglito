---
tags:
  - neoglito
  - repository
  - documentacion-tecnica
funcionalidad: Repository
actualizado: 2026-10-10
---

# Repository · diagnóstico y pruebas

## Configuración y dependencias

| Dependencia | Uso |
|---|---|
| DATABASE_URL | Prisma: metadatos, proyectos y conexión GitHub |
| ENCRYPTION_SECRET_KEY | Clave Base64 de 32 bytes para descifrar credenciales |
| JWT y conexión OAuth | Identidad local y acceso GitHub para all/clone |
| git disponible en PATH | Ejecutable invocado por el adaptador |
| Soporte para askpass.sh | Helper con shebang /bin/sh |
| cwd del backend | Raíz repo usada para clones |
| Permisos de disco y directorio temporal | Crear padres del destino y ASKPASS, eliminar temporales |
| Acceso de red | GitHub API y clone HTTPS |
| VITE_API_URL | Dirección del backend desde el frontend |

No hay variable propia para la raíz de clones, ejecutable Git, rama o timeout de este módulo. El entorno del proceso Git hereda process.env, además de las variables de ASKPASS. La inicialización global del backend tiene dependencias adicionales descritas en [[Startup - Indice]].

## Diagnóstico por síntoma

| Síntoma | Causa compatible con el código | Revisar |
|---|---|---|
| Faltan repositorios del catálogo | Solo una página per_page=100 o acceso remoto limitado | Request remoto y credenciales |
| Registro existe pero no aparece en all | all consulta GitHub, no Repository | Diferencia entre catálogo y tabla local |
| Se puede registrar sin sesión | registry no tiene guard | Decoradores del controlador |
| 404 al listar/clonar con JWT | Falta GitHubConnection | Relación por userId |
| 502 al listar | GitHub retornó HTTP no exitoso | Estado de acceso remoto; el mensaje local es genérico |
| 500 al descifrar | Clave o payload incompatible | Cifrado de Autenticacion |
| No fue posible ejecutar Git | Evento error al iniciar el proceso | PATH y disponibilidad del ejecutable |
| Clone devuelve error con stderr | Git terminó con código distinto de cero | URL, permisos, red, ASKPASS o destino |
| Cambios remotos no aparecen | Destino existente se devuelve sin pull/fetch | Copia local y su origen |
| Dos owners dan la misma ruta | Destino usa nombre corto y username autenticado | Colisión owner/repo |
| Existe carpeta pero falla análisis | access no verifica `.git` ni integridad | Contenido real del destino |
| Un clone fallido se reutiliza después | El adaptador no limpia destination | Directorio parcial que siga existiendo |
| Dos clones concurrentes fallan | Sin lock sobre el destino | Requests en curso y misma ruta |
| Un repositorio aparece en varios proyectos | Relación muchos a muchos y connect acumulativo | Vínculos ORM |
| Un vínculo duplicado devuelve 409 | Validación previa de projectId+cloneUrl | Completar solo vínculos faltantes |
| Entorno nuevo falla al consultar relaciones | Diferencias entre migraciones históricas y modelo | [[Repository - ORM y vinculacion]] |

## Ejemplos de ramas

1. **Vínculo a dos proyectos:** registrar id 235 y la misma URL en Project 1, luego Project 2, agrega ambos vínculos al mismo registro. La segunda respuesta contiene projectId 2, no todo el array de asociaciones.
2. **Mismo vínculo repetido:** registrar de nuevo ese cloneUrl en Project 1 devuelve 409 antes de upsert.
3. **URL no válida para clonar:** registry acepta una cadena no vacía con formato distinto, pero clone aplica su validación HTTPS GitHub y puede devolver 400.
4. **Carpeta existente y token revocado:** clone puede devolver la ruta sin usar el token remoto, siempre que exista la conexión local y el destino sea accesible. Eso no demuestra acceso actual a GitHub.
5. **Sin conexión y carpeta existente:** clone devuelve 404 porque busca conexión antes de revisar el destino.
6. **Owners diferentes:** equipo-a/api y equipo-b/api, para username ana, generan el mismo destino repo/ana/api. El segundo request puede reutilizar el contenido del primero.
7. **Fallo durante un análisis paralelo:** Promise.all puede rechazar mientras otros procesos Git continúan. No hay compensación de clones completados ni transacción con la base de datos.

Son ejemplos inferidos de condiciones del código, no resultados de operaciones ejecutadas.

## Pruebas y verificación

No se encontraron specs dedicados al CRUD de Repository, GetRepositoriesUseCase, CloneRepositoryUseCase o GitCloneRepositoryService en src/repository, src/shared/infrastructure/git y los tests revisados. ProjectAnalysisService sí tiene pruebas del consumidor del clonador, pero no equivalen a una integración real con GitHub, Git, ASKPASS y Prisma. Algunas pruebas de frontend de Deployment usan objetos Repository para verificar la configuración Compose.

Casos relevantes para pruebas futuras: mapeo de nulos del catálogo, errores de conexión/HTTP, vínculos compartidos y duplicados, URLs y username inválidos, destino existente, colisiones de nombre corto, errores del proceso Git y limpieza del helper temporal. Una comprobación del listado debe distinguir registros locales de datos remotos.

La verificación de esta entrega revisó las fuentes, los enlaces internos, las rutas de archivos fuente y los bloques Markdown, además de comparar la copia del vault con los archivos generados. No se ejecutaron pruebas de aplicación, requests, clones ni migraciones. No confirma el estado real de la base de datos o de las credenciales.

Volver a [[Repository - Indice]].

## Fuentes del código

- [src/repository/application/use-cases/repository/get-repositories.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/get-repositories.use-case.ts)
- [src/repository/application/use-cases/repository/clone-repository.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/clone-repository.use-case.ts)
- [src/repository/application/use-cases/repository/create-repository.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/create-repository.use-case.ts)
- [src/shared/infrastructure/git/git-repository-cloner.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/git/git-repository-cloner.service.ts)
- [src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts)
- [src/analisys/application/project-analysis.service.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/application/project-analysis.service.spec.ts)
- [test/frontend-deployment-request.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/test/frontend-deployment-request.spec.ts)
