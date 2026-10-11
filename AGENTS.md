# Notas para agentes

## Vite fijado a la rama clásica (no Rolldown) en `apps/web`

`apps/web` usa `vite@^6.3.5` (bundler clásico basado en esbuild) y
`@vitejs/plugin-react@^4.3.4` (transform basado en Babel) **a propósito**.
No actualizar a Vite 8 ni a `@vitejs/plugin-react@6.x` sin antes verificar
que el problema de abajo esté resuelto en esas versiones.

**Motivo:** con `vite@8.x` + `@vitejs/plugin-react@6.x` (que usan el motor
Rolldown/oxc) el transform JSX en modo desarrollo no inyecta la metadata de
depuración (`_debugSource`, `_debugOwner`/owner stack) que React DevTools
necesita. Resultado observado: en el panel "Components" de React DevTools,
al seleccionar cualquier componente, "props" carga bien pero las secciones
**"rendered by"** y **"source"** se quedan vacías permanentemente. No es un
bug de la app ni de Docker; se reprodujo igual en Docker y en ejecución
nativa, y con o sin `babel-plugin-react-compiler` activo.

**Fix aplicado:** bajar a la rama clásica de Vite (pre-Rolldown) restaura el
transform de Babel completo y los paneles de DevTools vuelven a funcionar.

El React Compiler se integra ahora directamente vía la opción `babel` de
`@vitejs/plugin-react` en [apps/web/vite.config.ts](apps/web/vite.config.ts),
ya no a través de `@rolldown/plugin-babel` (paquete eliminado de
`devDependencies`).
