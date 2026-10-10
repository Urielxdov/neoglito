---
tags:
  - neoglito
  - documentacion
actualizado: 2026-10-10
tipo: documentacion-tecnica
---

# Desarrollo y pruebas

Ejecuta desde la raíz del código. Los comandos siguientes documentan scripts existentes; no indican que hayan pasado durante esta revisión.

| Comando | Propósito |
| --- | --- |
| `npm ci` | Instala dependencias del lockfile y workspaces |
| `npm run start:dev` | Backend en watch |
| `npm run build` | Compila backend con Nest |
| `npm run lint` | Oxlint con análisis de tipos en src y test |
| `npm run format` | Prettier; modifica archivos |
| `npm run test` | Vitest, archivos `**/*.spec.ts` |
| `npm run test:watch` | Vitest en watch |
| `npm run test:cov` | Cobertura |
| `npm run test:e2e` | Config separada para `**/*.e2e-spec.ts` |
| `npm run prisma:generate` | Genera cliente Prisma |
| `npm run prisma:migrate` | Migraciones de desarrollo |
| `npm run prisma:deploy` | Aplica migraciones existentes |
| `npm run prisma:studio` | Inspección de datos |
| `npm --workspace @neoglito/web run dev` | Vite |
| `npm --workspace @neoglito/web run build` | TypeScript y build frontend |
| `npm --workspace @neoglito/web run lint` | ESLint frontend |

Consulta la observación sobre `prisma7.config.ts` en [[03 - Instalacion y configuracion]] si el CLI no detecta la configuración.

## Pruebas presentes

- Análisis de proyecto y extracción de variables YAML.
- Preparación del Compose y adaptación de puertos.
- Despliegue, consulta de asignaciones y clasificación.
- Runtime Docker y traducción de rutas al host.
- Catálogo de imágenes y discriminadores de clasificación.
- Búsqueda recursiva de archivos.
- Contratos de frontend para peticiones, clasificación y campos de puertos.
- Prueba e2e de la aplicación.

Antes de cambiar un contrato, revisa consumidores de `packages/shared`. Si cambias despliegues, verifica preparación YAML, reservas, fallo parcial y detención. Si cambias clasificación, verifica servicios sin publicación y resultados ambiguos. Algunas pruebas de integración pueden necesitar servicios reales; revisa sus fixtures y requisitos antes de ejecutarlas.

## Fuentes del repositorio

- [package.json](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/package.json)
- [vitest.config.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/vitest.config.ts)
- [vitest.config.e2e.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/vitest.config.e2e.ts)
- [apps/web/package.json](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/package.json)
