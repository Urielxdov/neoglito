---
tags:
  - neoglito
  - startup
  - documentacion-tecnica
funcionalidad: startup
actualizado: 2026-10-10
---

# Startup · uso, configuración y diagnóstico

## Cómo se ejecuta

Startup es automático al iniciar el backend. Desde la raíz del proyecto, `npm run start:dev` usa `nest start --watch`; `npm start` usa `nest start`. En producción, el script declarado `npm run start:prod` usa `node dist/src/main` y requiere compilación previa. No se verificó el arranque de esos comandos en esta tarea documental.

En `docker-compose.yml`, la API espera los healthchecks de PostgreSQL y Redis. Su comando ejecuta, en orden, `npm ci --include=dev`, `npx prisma generate`, `npx prisma db push` y `npm run start:dev`. Esa preparación ocurre antes de `main.ts`: el bootstrap por sí solo no genera Prisma ni aplica esquemas o migraciones.

El socket `/var/run/docker.sock` se monta dentro de la API para acceder al daemon del host. PostgreSQL tiene volumen `postgres_data`; Redis no tiene un volumen persistente declarado en este Compose. La recuperación permite reconstruir las asociaciones faltantes a partir de las filas seleccionadas de PostgreSQL.

## Variables relevantes

| Variable | Lectura / valor por defecto | Efecto |
| --- | --- | --- |
| `DATABASE_URL` | Obligatoria en PrismaService | Conexión PostgreSQL; falta impide crear el servicio |
| `REDIS_URL` | RedisConnection: `redis://localhost:6379` | Conexión Redis; Compose usa por defecto `redis://redis:6379` |
| `DOCKER_PATH` | Opcional | Primer candidato para ejecutar docker info; ruta completa recomendada |
| `PORT` | main: `3000` mediante `??` | Puerto de escucha HTTP |
| `FRONTEND_URL` | main: `http://localhost:5174` mediante `??` | Origen permitido por CORS |
| `JWT_SECRET` | Obligatoria en JwtStrategy | AuthModule forma parte del arranque aunque no se use login |
| `ENCRYPTION_SECRET_KEY` | Obligatoria; base64 de 32 bytes | Construcción del cifrador registrado en AuthModule |

`.env` se busca respecto al directorio de trabajo del proceso; si existe se usa `loadEnvFile()`. Las variables ya presentes en el entorno del proceso tienen prioridad. Los fallbacks con `??` no reemplazan una cadena vacía.

La configuración OAuth y sus variables están descritas en las notas de autenticación. Startup no recibe parámetros HTTP, usuario autenticado ni un número de puerto específico solicitado por un cliente.

## Endpoints relacionados

No existe `/startup` ni un endpoint para disparar la recuperación. Se relaciona con estas rutas para inspección después del arranque:

| Método / ruta | Parámetros | Autenticación | Utilidad |
| --- | --- | --- | --- |
| `GET /` | Ninguno leído por el handler | Sin guard | AppController devuelve Hello World! mediante el interceptor global |
| `GET /port` | Ninguno leído por el handler | Sin guard | Lista asociaciones actuales de reservas en Redis |
| `/docs` | Interfaz Swagger | Sin guard configurado en main | Consultar documentación HTTP generada |

Ejemplo ilustrativo de `GET /port` con una reserva restaurada:

```json
{
  "success": true,
  "data": {
    "port-reservation:owner:container-123": "port-reservation:port:8080"
  },
  "error": null,
  "meta": null
}
```

`GET /port` puede mostrar otras reservas existentes además de las restauradas. `GET /` no es un healthcheck dedicado de PostgreSQL, Redis o Docker: sólo responde a través de la aplicación que terminó su inicialización. No hay un endpoint específico de readiness en los archivos revisados.

## Fallos y diagnóstico

| Síntoma / mensaje | Origen y comprobación |
| --- | --- |
| Docker no está instalado o no está disponible para Node | Candidatos CLI no encontrados; revisar PATH o DOCKER_PATH en el entorno del proceso |
| Docker está instalado, pero el daemon no está disponible | docker info terminó sin éxito; revisar Docker Desktop/servicio y socket/contexto |
| No se pudo verificar Docker | Error de ejecución distinto de ENOENT, incluido timeout |
| DATABASE_URL is required to initialize Prisma | Configuración faltante al construir PrismaService |
| Error de Prisma durante conexión o findMany | Revisar accesibilidad de PostgreSQL, credenciales y esquema existente |
| Redis client error | Evento registrado por RedisConnection; comprobar REDIS_URL y conectividad |
| No se pudieron restaurar las reservas de puertos: … | Una o más llamadas devolvieron false; revisar parejas de claves, duplicados y rango |
| API no escucha pese a reservas parcialmente creadas | Un hook falló después de otras restauraciones; no hay rollback global |

El conflicto usa el formato `${service.id} (puerto ${service.port})` y concatena todos los encontrados. El log de éxito es `Reservas de puertos restauradas para N contenedor(es) activo(s)`; «activos» se refiere a los estados persistidos seleccionados.

## Comprobación manual sugerida

1. Revisar Docker, PostgreSQL, Redis y variables del proceso antes de iniciar la API.
2. Identificar en PostgreSQL servicios running/paused/restarting con puerto mayor que cero.
3. Iniciar backend y contrastar el log con esas filas.
4. Consultar GET /port o inspeccionar ambas claves Redis para confirmar las asociaciones.
5. En un entorno de pruebas, reiniciar backend conservando claves: las parejas correctas deben aceptarse de nuevo.
6. Para investigar un fallo, contrastar cada ID/puerto reportado con ambas claves. Determinar quién mantiene realmente la reserva antes de corregir datos.

Estas comprobaciones no se ejecutaron durante la documentación. No se encontraron pruebas específicas del servicio startup en `src` o `test`; existen pruebas de despliegue que simulan llamadas a `restorePort`, lo que no verifica este hook ni el script Redis real.

Las reglas de selección y los casos Redis se detallan en [[Startup - ORM y Redis]].

## Fuentes del código

- [package.json](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/package.json)
- [docker-compose.yml](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/docker-compose.yml)
- [src/main.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/main.ts)
- [src/app.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/app.controller.ts)
- [src/app.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/app.service.ts)
- [src/ports/presentation/port.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/presentation/port.controller.ts)
- [src/shared/presentation/interceptors/api-response.interceptor.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/presentation/interceptors/api-response.interceptor.ts)
- [src/shared/infrastructure/cache/redis-connection.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/cache/redis-connection.service.ts)
- [src/prisma/prisma.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/prisma/prisma.service.ts)
- [src/auth/infrastructure/passport/jwt.strategy.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/auth/infrastructure/passport/jwt.strategy.ts)
- [src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/security/aes-256-gcm-encryption.service.ts)
- [src/startup/restore-deployment-port-reservations.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/startup/restore-deployment-port-reservations.service.ts)
- [src/deployment/application/use-cases/deploy-compose.use-case.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/deploy-compose.use-case.spec.ts)
