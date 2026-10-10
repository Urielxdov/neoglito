---
tags:
  - neoglito
  - documentacion
actualizado: 2026-10-10
tipo: documentacion-tecnica
---

# Diagnóstico y límites

## Problemas frecuentes

| Síntoma | Qué revisar |
| --- | --- |
| La API falla al arrancar | Docker operativo; `main.ts` lo comprueba antes de crear Nest |
| Error de DATABASE_URL | Variable definida y host correcto dentro/fuera de Compose |
| Error de cifrado | ENCRYPTION_SECRET_KEY debe decodificar a 32 bytes |
| JWT_SECRET is required | Completar `.env` |
| OAuth no vuelve al frontend | Client ID/Secret, callback idéntico al registrado y FRONTEND_URL |
| `/auth/me` responde 401 | Cookie, vencimiento, origen CORS y credenciales del cliente |
| Redis no conecta | REDIS_URL; `redis` es hostname interno del Compose |
| No encuentra Compose | Nombre compatible con el patrón actual; ver [[07 - Repositorios y analisis Compose]] |
| Código clonado desactualizado | El destino existente se reutiliza sin pull |
| Puerto en conflicto | Reservas Redis y listener real del servidor; TTL provisional de cinco minutos |
| Falla restauración al iniciar | Reservas de servicios persistidos activos que entran en conflicto |
| Servicio queda UNKNOWN | Revisar imagen, protocolos, comandos y configuración; la ambigüedad también guarda UNKNOWN |
| Sondas fallan desde la API | CONTAINER_PROBE_HOST y acceso a puertos publicados en el host |
| Build/bind mount falla | Traducción de rutas del cliente al host del daemon |
| Prisma no descubre configuración | Probar `--config prisma7.config.ts`; ver [[03 - Instalacion y configuracion]] |

Para revisar servicios del entorno:

```powershell
docker compose ps
docker compose logs --tail 100 api
docker compose logs --tail 100 redis postgres
```

## Límites y pendientes observados

- Los proyectos no tienen propietario User y el listado de persistencia es global.
- Registro de proyectos/repositorios y consulta de reservas no tienen guard JWT en los controladores revisados.
- La búsqueda usada por análisis se limita a `docker-compose*.yml`.
- Un servicio persiste un único puerto; no representa todas las publicaciones múltiples.
- La evidencia y los candidatos de clasificación no se almacenan.
- La vista de relaciones entre servicios tiene un placeholder.
- El README no refleja por completo módulos y endpoints actuales.
- Swagger declara algunos códigos de respuesta que no se fijan explícitamente en los handlers POST.

Estos puntos describen el estado del código; no se modificó la aplicación para corregirlos. Para ampliar la plataforma, considera propiedad por usuario, detección Compose más amplia, múltiples publicaciones y un modelo de relaciones/evidencia. Son propuestas de evolución, no funciones ya implementadas.

## Fuentes del repositorio

- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
- [src/analisys/application/project-analysis.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/application/project-analysis.service.ts)
- [src/startup/restore-deployment-port-reservations.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/startup/restore-deployment-port-reservations.service.ts)
- [src/project/infrastructure/persistence/prisma-project.repository.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/project/infrastructure/persistence/prisma-project.repository.ts)
