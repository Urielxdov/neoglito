---
tags:
  - neoglito
  - telemetry
  - opentelemetry
  - documentacion-tecnica
funcionalidad: telemetry
actualizado: 2026-10-11
---

# Telemetry · documentación técnica

`src/telemetry` implementa la observabilidad de neoglito con OpenTelemetry: **traces, metrics y logs** de la propia API y de los contenedores que la plataforma despliega. Un OpenTelemetry Collector independiente recibe los datos, y la API actúa como backend de observabilidad: los valida, los guarda en PostgreSQL mediante Prisma y los expone con endpoints protegidos por JWT.

Inferido del código revisado el **11 de octubre de 2026**. Los ejemplos ilustran contratos y formatos; no proceden de una ejecución contra una instalación en producción.

## Recorrido de lectura

1. [[Telemetry - Flujo]]: recorrido completo de un dato, desde el emisor hasta la consulta.
2. [[Telemetry - Collector y receptor]]: configuración del collector, receptor OTLP en la API y autenticación por token.
3. [[Telemetry - Inyeccion en despliegues]]: cómo se configuran los contenedores desplegados y los agentes de auto-instrumentación.
4. [[Telemetry - API, ORM y retencion]]: instrumentación de la API, modelo de datos, consulta y purga.
5. [[Telemetry - Configuracion diagnostico y pruebas]]: variables, ejecución, fallos y alcance.

## Alcance

- El collector es el contenedor oficial `otel/opentelemetry-collector-contrib`; no es código TypeScript del repositorio. Lo que sí es código propio: el backend receptor, el inyector, el SDK de la API, la persistencia y la retención.
- La API en el puerto 3000 conserva sus responsabilidades; el collector escucha aparte en el puerto **4318** (OTLP/HTTP).
- Cada despliegue recibe su propio token. La API usa un token de sistema.
- Quedan fuera: .NET y Go, OTLP/gRPC (puerto 4317), OTLP protobuf directo a la API y la interfaz en `apps/web`.

## Fuentes del código

- [src/telemetry/README.md](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/README.md)
- [src/telemetry/telemetry.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/telemetry/telemetry.module.ts)
- [docker-compose.yml](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/docker-compose.yml)
- [src/app.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/app.module.ts)
