---
tags:
  - neoglito
  - repository
  - documentacion-tecnica
funcionalidad: Repository
actualizado: 2026-10-10
---

# Repository · documentación técnica

`RepositoryModule` permite consultar los repositorios accesibles mediante la conexión GitHub del usuario, registrar sus metadatos asociados a proyectos y clonar repositorios en el disco del backend para el análisis Compose.

Documentación inferida del código revisado el **10 de octubre de 2026**. No se hicieron peticiones a GitHub, clones, migraciones ni pruebas de la aplicación para redactarla.

## Recorrido

1. [[Repository - Flujos]]: listado remoto, registro y clonación.
2. [[Repository - Implementacion y contratos]]: dependencias, casos de uso, entidades y puertos.
3. [[Repository - ORM y vinculacion]]: upsert, relaciones y conflictos.
4. [[Repository - GitHub y credenciales]]: conexión, consulta remota y cifrado.
5. [[Repository - Clonacion paso a paso]]: validación, destino, ASKPASS y ejecución Git.
6. [[Repository - Endpoints]]: parámetros, respuestas y errores.
7. [[Repository - Uso y frontend]]: búsqueda, selección, caché y registro desde Project.
8. [[Repository - Diagnostico y pruebas]]: límites, ejemplos y verificación.

## Tres representaciones diferentes

| Representación | Fuente | Contenido |
|---|---|---|
| Catálogo remoto | GitHub `/user/repos` | Visibilidad, descripción, lenguaje, URLs y fecha remota |
| Registro persistido | Prisma Repository | id, name, gitUrl, cloneUrl y proyectos vinculados |
| Copia local | Disco del backend | Directorio bajo `repo/<username>/<nombre>` |

Listar no registra automáticamente en Prisma. Registrar no clona. Clonar directamente no exige un registro Repository ni un vínculo Project. El análisis de un proyecto combina los vínculos persistidos con el clonador exportado por este módulo.

El registro HTTP es público. Listado y clonación requieren JWT. Reutilizar un destino existente no comprueba `.git`, URL de origen, rama ni actualización. El listado remoto no pagina después de sus primeros 100 resultados.

Relacionados: [[Project - Indice]], [[Autenticacion - Indice]], [[Analisis - Indice]] y [[Deployment - Indice]].

## Fuentes del código

- [src/repository/repository.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/repository.module.ts)
- [src/repository/presentation/repository.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/presentation/repository.controller.ts)
- [prisma/models/repository.prisma](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/prisma/models/repository.prisma)
