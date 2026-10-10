---
tags:
  - neoglito
  - autenticacion
  - documentacion-tecnica
funcionalidad: autenticacion
actualizado: 2026-10-10
---

# Autenticación · uso y frontend

## Interacción del usuario

1. Abrir el frontend en `http://localhost:5174`.
2. Si no hay sesión, ProtectedRoute redirige a `/authentication`.
3. La acción GitHub establece un mensaje de espera y ejecuta `authService.connectWithGitHub()`.
4. `window.location.assign()` navega a la API `/auth/github`; la autorización ocurre en GitHub.
5. El callback instala la cookie y devuelve al frontend.
6. AuthProvider consulta `/auth/me` al montarse y habilita la vista protegida si obtiene identidad.

El callback vuelve a FRONTEND_URL. Aunque ProtectedRoute guarda la ubicación previa en `state.from`, el flujo revisado no la usa para reconstruir el destino después de OAuth.

## Componentes y estado

| Pieza | Función |
| --- | --- |
| AuthenticationPage | Coordina acciones y mensajes del panel |
| GitHubConnectionPanel | Presentación de conexión |
| authService.getGitHubConnectionUrl | Construye URL usando VITE_API_URL sin slash final |
| authService.connectWithGitHub | Navegación completa a OAuth |
| authService.getCurrentUser | GET /auth/me mediante apiClient |
| AuthProvider | Contexto, reducer y comprobación inicial |
| useAuth | Acceso al contexto; lanza Error fuera del provider |
| ProtectedRoute | Espera, redirección o Outlet |

Estado inicial: `{ status: 'loading', user: null }`. Las acciones del reducer son authenticated con usuario y unauthenticated sin usuario. `refresh()` del contexto consulta identidad; no llama a un endpoint de renovación ni cambia el estado a loading antes de consultar nuevamente.

AuthenticationPage también tiene una acción primaria que muestra `Sincronización activa`; ese handler solo actualiza el mensaje local. El botón cancelar limpia el mensaje local; no cierra sesión ni revoca GitHub.

## Consumir identidad desde otro componente

Patrón compatible con el contexto existente, dentro de AuthProvider:

```tsx
const { status, user, refresh } = useAuth()
// user?.id es el ID local; user?.username es el login GitHub.
// refresh() vuelve a consultar identidad, no renueva el JWT.
```

## Consumir la API desde un cliente HTTP

Para OAuth, inicia la navegación en un navegador. Un fetch aislado no reemplaza el recorrido de redirecciones e interacción del usuario.

Para comprobar una sesión existente desde el frontend:

```typescript
const response = await fetch('http://localhost:3000/auth/me', {
  credentials: 'include',
  headers: { Accept: 'application/json' },
})
const result = await response.json()
```

Para un cliente que ya disponga de un JWT local, puede enviar `Authorization: Bearer <JWT de Neoglito>`. El callback público no devuelve un JWT en JSON. Un token de GitHub no reemplaza al JWT de Neoglito para `/auth/me`.

apiClient exige el formato API estándar y convierte errores de red en NETWORK_ERROR y formatos no reconocidos en INVALID_API_RESPONSE. AuthProvider considera ambos casos una sesión no autenticada; no conserva un estado diferenciado de fallo de conectividad.

Relacionadas: [[Autenticacion - Endpoints]], [[Autenticacion - Configuracion y diagnostico]].

## Fuentes del código

- [apps/web/src/pages/authentication-page.tsx](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/pages/authentication-page.tsx)
- [apps/web/src/features/auth/auth.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/auth/auth.service.ts)
- [apps/web/src/features/auth/auth-context.tsx](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/auth/auth-context.tsx)
- [apps/web/src/features/auth/auth.reducer.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/auth/auth.reducer.ts)
- [apps/web/src/features/auth/use-auth.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/auth/use-auth.ts)
- [apps/web/src/app/protected-route.tsx](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/app/protected-route.tsx)
- [apps/web/src/shared/api/client.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/shared/api/client.ts)
