---
tags:
  - neoglito
  - analisis
  - documentacion-tecnica
funcionalidad: analisis
actualizado: 2026-10-10
---

# Análisis · documentación técnica

`AnalysisModule`, ubicado en `src/analisys` (nombre real de la carpeta), concentra el descubrimiento de archivos Docker Compose y la extracción de sus variables de entorno y puertos. Exporta `ProjectAnalysisService` para los consumidores del módulo de despliegues.

Documentación inferida del código revisado el **10 de octubre de 2026**. Los ejemplos son ilustrativos; no son respuestas obtenidas de infraestructura activa.

## Recorrido de lectura

1. [[Analisis - Flujo]]: consulta, clonación, descubrimiento y extracción.
2. [[Analisis - Implementacion y contratos]]: módulo, servicio, métodos e inyección.
3. [[Analisis - ORM y archivos]]: modelos consultados, clones y búsqueda recursiva.
4. [[Analisis - Variables y puertos]]: reglas de extracción, ejemplos y límites.
5. [[Analisis - Endpoints]]: autenticación, parámetros, respuestas y errores.
6. [[Analisis - Uso y frontend]]: consumo interno, apertura de proyectos y botón Analizar.
7. [[Analisis - Diagnostico y pruebas]]: requisitos, fallos y cobertura existente.

## Responsabilidad y efectos

El análisis consulta PostgreSQL y puede clonar repositorios en disco. No guarda los resultados del análisis en una tabla, no reserva puertos y no inicia contenedores por sí mismo. La respuesta describe las declaraciones del YAML; no certifica que Docker pueda ejecutarlo.

La interfaz también llama «Analizar» a un flujo que **despliega y clasifica contenedores**. Su estado se encuentra en `apps/web/src/features/analysis`. Esa interacción se explica en [[Analisis - Uso y frontend]] para distinguir sus efectos de los del servicio backend.

## Fuentes del código

- [src/analisys/analysis.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/analysis.module.ts)
- [src/analisys/application/project-analysis.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/application/project-analysis.service.ts)
- [apps/web/src/features/projects/hooks/use-project-analysis.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/hooks/use-project-analysis.ts)
