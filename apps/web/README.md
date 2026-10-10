# Neoglito frontend

## Páginas y navegación

Las rutas se declaran en `src/app/app-routes.tsx`. `app.tsx` conecta el router
y la autenticación; `workspace-layout.tsx` conserva los contextos compartidos
entre páginas y muestra la navegación principal.

| URL | Página | Propósito |
| --- | --- | --- |
| `/authentication` | `authentication-page.tsx` | Conectar la cuenta |
| `/repositories` | `repository-selection-page.tsx` | Seleccionar repositorios |
| `/projects` | `projects-page.tsx` | Listar y crear proyectos |
| `/projects/:projectId/deploy` | `project-detail-page.tsx` | Configurar el despliegue |
| `/projects/:projectId/routes` | `project-detail-page.tsx` | Rutas API |
| `/projects/:projectId/repos` | `project-detail-page.tsx` | Repositorios del proyecto |
| `/projects/:projectId/general` | `project-detail-page.tsx` | Editar datos del proyecto |
| `/projects/:projectId/analysis` | `project-analysis-page.tsx` | Análisis en curso o recuperación de despliegues registrados |

`/` redirige a `/repositories`; `/projects/:projectId` abre la pestaña de
despliegue. Todas las páginas del workspace requieren autenticación.
`project-layout.tsx` carga y valida el proyecto de la URL. Los archivos en
`pages/views` conectan los componentes de presentación con los hooks de cada
funcionalidad.

La URL controla la página y la pestaña activa. Los reducers conservan los
formularios y el resultado de análisis al navegar. Al recargar se vuelven a
cargar los datos del proyecto y Compose; los borradores y el análisis de la
sesión no se persisten. Al abrir la URL de análisis sin estado de sesión se
recuperan los despliegues mediante `GET /deployment/project/:projectId`.
**Ver análisis existente**, en Despliegue, abre `/analysis?view=saved` y fuerza
esa consulta incluso si quedó un análisis pendiente en la sesión. No inicia
ni reclasifica contenedores. Se muestran los servicios, su clasificación y los
estados de la última observación guardada; no es un monitor en tiempo real.

Para crear un proyecto, selecciona repositorios y pulsa **Nuevo proyecto**:
se abre el formulario en `/projects`. Al terminar se navega a su despliegue.

En producción, el servidor del frontend debe devolver `index.html` para las
rutas del cliente. Vite ya permite abrirlas directamente en desarrollo.

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
