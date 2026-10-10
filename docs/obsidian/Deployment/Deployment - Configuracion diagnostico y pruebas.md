---
tags:
  - neoglito
  - deployment
  - documentacion-tecnica
funcionalidad: deployment
actualizado: 2026-10-10
---

# Deployment · configuración, diagnóstico y pruebas

## Configuración

| Elemento | Alcance |
| --- | --- |
| DEPLOYMENT_COMPOSE_DIRECTORY | Directorio generado; default .neoglito/deployments desde cwd |
| DATABASE_URL | Prisma/PostgreSQL para proyectos, deployments y servicios |
| REDIS_URL | Conexión de reservas; RedisConnection usa fallback redis://localhost:6379 |
| Docker CLI y daemon | Runtime requiere docker y docker compose disponibles |
| CONTAINER_PROBE_HOST | Clasificador; default 127.0.0.1, Compose de Neoglito usa fallback host.docker.internal |
| JWT_SECRET y sesión | Acceso a endpoints protegidos |

Las rutas de Compose y directorios originales deben seguir accesibles para consultar procedencia, clasificar y detener. El generador escribe datos de configuración, potencialmente credenciales; .gitignore y .dockerignore excluyen .neoglito. No existe limpieza automática de esos archivos en los casos de uso revisados.

## Diagnóstico

| Síntoma | Punto a revisar |
| --- | --- |
| Compose no pertenece al proyecto | projectId y ruta devuelta por descubrimiento |
| Variable duplicada | Solapamiento service/key entre filas globales y específicas |
| Puerto no pertenece al archivo | Coincidencia exacta targetPort/protocol/hostIp |
| Puerto publicado inválido | Número o rango concreto, sin interpolación |
| No se pudo reservar temporalmente | Socket TCP del entorno API, Redis y conflicto de owner |
| Fallo de listener en modo espejo | Soporte de PORT/comando, mappings individuales TCP |
| Down o classify apunta al proyecto inesperado | Archivo propio esperado, deploymentId y compatibilidad antigua |
| /ports falla en deployment activo | Archivo generado ausente/ilegible o YAML inválido |
| Deployment running pero servicio exited/unhealthy | No existe espera de readiness en deploy |
| Clasificación 409 inmediatamente después de desplegar | Servicios ausentes o todavía no running; no hay reintento automático |
| Clasificación UNKNOWN | Evidencia insuficiente/ambigua o herramienta catalogada UNKNOWN |
| Base, reservas y Docker difieren | Sin reconciliación periódica ni transacción distribuida |
| Stop devuelve failed con servicios todavía guardados running | Error en down, Redis o actualización posterior |
| Deploy nuevo usa la misma configuración del repositorio | Los archivos ya clonados no se actualizan automáticamente por descubrimiento |

Los logs distinguen [deployment:backend], [deployment:compose], [deployment:http] y [deployment:ui]. Registran selección, rutas, puertos y nombres de variables. Los logs mostrados aquí no incluyen sus valores, pero los YAML sí los contienen; errores de Docker pueden incluir stdout/stderr.

Las operaciones Compose no tienen timeout configurado en el runtime. No existe endpoint de cancelación de la solicitud. No hay bloqueo por proyecto, idempotency key ni validación de transiciones: solicitudes repetidas pueden crear deployments distintos y competir por los puertos.

## Pruebas existentes revisadas

| Archivo | Cobertura observada |
| --- | --- |
| deploy-compose.use-case.spec.ts | Servicio sin puerto, configuración real enviada, rechazo antes de Docker, conflicto de hold, compensación parcial y parada actual/antigua |
| yaml-deployment-compose.service.spec.ts | Procedencia, archivo independiente, variables scoped, literales, aislamiento, modo espejo, bind mounts, anchors, rangos/UDP y validación |
| classify-deployment-services.use-case.spec.ts | Proyecto propio, tipos y observaciones, worker sin puerto, cadena real de clasificación y rechazos sin escrituras parciales |
| get-deployment-ports.use-case.spec.ts | Consulta por ID, puertos/null y deployment inexistente |
| service-image-catalog.spec.ts | Normalización de imágenes, candidatos ambiguos y UNKNOWN explícito |
| frontend-deployment-request.spec.ts | Selección de archivo/servicio y valores required |
| frontend-deployment-classification.spec.ts | Secuencia deploy/classify y conservación del despliegue ante errores de clasificación |
| frontend-deployment-assigned-ports.spec.ts | Asignaciones actuales, fallos, compatibilidad y mappings ambiguos |

Se revisaron como evidencia; **no se ejecutaron durante esta documentación**. Mocks de runtime/Prisma/HTTP no demuestran conectividad o limpieza de recursos reales.

Una verificación de integración necesita un proyecto de prueba: descubrir, desplegar, contrastar archivo generado y datos guardados, clasificar, consultar puertos y detener. Revisar por separado efectos en Docker y Redis, porque stopped/failed en la base no prueba por sí solo la ausencia de recursos. No se realizó ese recorrido para redactar estas notas.

## Fuentes del código

- [src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/infrastructure/compose/yaml-deployment-compose.service.ts)
- [src/shared/infrastructure/cache/redis-connection.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/cache/redis-connection.service.ts)
- [.gitignore](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/.gitignore)
- [.dockerignore](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/.dockerignore)
- [src/deployment/application/use-cases/deploy-compose.use-case.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/deploy-compose.use-case.spec.ts)
- [src/deployment/infrastructure/compose/yaml-deployment-compose.service.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/infrastructure/compose/yaml-deployment-compose.service.spec.ts)
- [src/deployment/application/use-cases/classify-deployment-services.use-case.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/classify-deployment-services.use-case.spec.ts)
- [src/deployment/application/use-cases/get-deployment-ports.use-case.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/get-deployment-ports.use-case.spec.ts)
- [src/deployment/domain/services/service-image-catalog.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/domain/services/service-image-catalog.spec.ts)
- [test/frontend-deployment-request.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/test/frontend-deployment-request.spec.ts)
- [test/frontend-deployment-classification.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/test/frontend-deployment-classification.spec.ts)
- [test/frontend-deployment-assigned-ports.spec.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/test/frontend-deployment-assigned-ports.spec.ts)
