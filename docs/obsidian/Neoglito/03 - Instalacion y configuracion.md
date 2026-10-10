---
tags:
  - neoglito
  - documentacion
actualizado: 2026-10-10
tipo: documentacion-tecnica
---

# Instalación y configuración

## Entorno con Docker Compose

Necesitas Docker con Compose y una OAuth App de GitHub. Ejecuta los comandos desde la raíz del repositorio original, no desde la bóveda.

```powershell
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Coloca la clave generada en `ENCRYPTION_SECRET_KEY` y completa `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` y `JWT_SECRET` en `.env`. Configura la OAuth App con homepage `http://localhost:5174` y callback `http://localhost:3000/auth/github/callback`.

```powershell
docker compose up --build
```

| Servicio | Dirección local |
| --- | --- |
| Frontend | http://localhost:5174 |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

La API ejecuta `npm ci --include=dev`, `prisma generate`, `prisma db push` y el servidor en modo watch. El frontend instala dependencias e inicia Vite. API espera los healthchecks de PostgreSQL y Redis. El contenedor API instala Git y Docker CLI y monta el socket Docker del host.

> [!note] Base de datos
> El Compose actual usa `db push` para sincronizar el esquema. No ejecuta `migrate deploy`. PostgreSQL conserva datos en `postgres_data`; Redis no tiene volumen persistente en este Compose.

## Variables de configuración

| Variable | Uso / valor de desarrollo |
| --- | --- |
| `DATABASE_URL` | PostgreSQL; dentro del Compose el host es `postgres` |
| `REDIS_URL` | Default local `redis://localhost:6379`; Compose usa `redis` |
| `ENCRYPTION_SECRET_KEY` | Clave de 32 bytes codificada en Base64 |
| `JWT_SECRET` | Firma y validación de sesión |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | OAuth App |
| `BACKEND_URL`, `GITHUB_CALLBACK_URL` | Construcción/configuración del callback |
| `FRONTEND_URL` | Origen CORS y redirección; default puerto 5174 |
| `VITE_API_URL` | URL del backend utilizada por el frontend |
| `PORT` | Puerto HTTP del backend; default 3000 |
| `CONTAINER_PROBE_HOST` | Host de sondas; Compose usa `host.docker.internal` |
| `DEPLOYMENT_COMPOSE_DIRECTORY` | Ubicación opcional de YAML generados |
| `NODE_TLS_REJECT_UNAUTHORIZED` | El ejemplo establece `1` |

Para instalar dependencias nuevas en los servicios existentes: `docker compose restart api frontend`. Para ejecución fuera de Docker necesitas Node/npm, Git, Docker operativo, PostgreSQL y Redis accesibles; consulta [[11 - Desarrollo y pruebas]].

> [!note] Configuración Prisma observada
> El archivo se llama `prisma7.config.ts` y apunta a la carpeta `prisma`. Los scripts invocan `prisma` sin `--config`. Si el CLI no descubre el archivo, usa explícitamente `npx prisma generate --config prisma7.config.ts` y revisa los comandos equivalentes. El arranque no se verificó en esta revisión.

## Fuentes del repositorio

- [docker-compose.yml](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/docker-compose.yml)
- [Dockerfile](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/Dockerfile)
- [.env.example](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/.env.example)
- [prisma7.config.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/prisma7.config.ts)
