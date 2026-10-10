---
tags:
  - neoglito
  - documentacion
actualizado: 2026-10-10
tipo: documentacion-tecnica
---

# Frontend

`apps/web` usa React 19, Vite, TypeScript, React Router, Zod y Tailwind mediante el plugin de Vite. El servidor escucha en 5174 con `strictPort: true`.

## Navegación

`app.tsx` declara `/authentication`, la ruta raíz protegida con `RepositorySelectionPage` y una redirección para rutas desconocidas. Las vistas de proyectos, detalle y análisis se organizan mediante contenedores y componentes; no todas son rutas de URL independientes.

| Área | Código principal |
| --- | --- |
| Sesión GitHub | `features/auth` |
| Selección de repositorios | `features/repositories` |
| Crear, editar y abrir proyectos | `features/projects/hooks` |
| Lista y detalle de proyectos | `features/projects/components/list` y `detail` |
| Configurar despliegue | `features/projects/components/deploy` |
| Explorar análisis | `features/projects/components/analyze` |
| Reservas | `features/ports` |
| Estado | Contextos y reducers de auth, repositories, projects, deploys y analysis |

Los servicios HTTP se encargan de llamadas; los mappers transforman contratos a modelos de UI; los hooks coordinan interacciones. `packages/shared` mantiene los contratos utilizados por ambos lados.

`apiClient` utiliza `VITE_API_URL`, añade `credentials: 'include'` y exige el envoltorio `success/data/error/meta`. Convierte problemas de red en `NETWORK_ERROR` y formatos inesperados en `INVALID_API_RESPONSE`.

La configuración de despliegue recupera puertos asignados y bloquea campos existentes para evitar volver a reservarlos. La petición usa `mirrorPorts: true`; consulta [[08 - Despliegues Docker]]. Existe un componente `analyze-relations-placeholder.tsx`: la vista completa de relaciones sigue pendiente.

## Fuentes del repositorio

- [apps/web/package.json](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/package.json)
- [apps/web/vite.config.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/vite.config.ts)
- [apps/web/src/app/app.tsx](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/app/app.tsx)
- [apps/web/src/shared/api/client.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/shared/api/client.ts)
- [apps/web/src/features/projects/components/analyze/analyze-relations-placeholder.tsx](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/components/analyze/analyze-relations-placeholder.tsx)
