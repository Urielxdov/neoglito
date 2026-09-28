# Neoglito

Neoglito es una plataforma para observar como se comunican los contenedores Docker de un proyecto y entender el comportamiento de sistemas distribuidos desde una vista centralizada.

El proyecto nace de un problema cada vez mas comun: el vibecoding acelera la generacion de codigo, pero tambien dificulta la trazabilidad cuando ese codigo no se revisa con suficiente contexto. Neoglito propone centralizar documentacion relacionada con endpoints, repositorios y archivos Docker/Compose para ayudar a visualizar como se conectan los servicios de una aplicacion.

## Objetivo

Neoglito busca facilitar el analisis de sistemas distribuidos compuestos por multiples repositorios y contenedores. La idea es que un desarrollador pueda autenticar su cuenta de GitHub, seleccionar repositorios, crear proyectos, clonar el codigo relacionado y extraer informacion tecnica util para entender la comunicacion entre servicios.

## Funcionalidades

- Autenticacion con GitHub mediante OAuth.
- Registro y consulta de repositorios asociados al usuario.
- Creacion de proyectos para agrupar repositorios relacionados.
- Clonado de repositorios Git.
- Busqueda recursiva de archivos Docker y Docker Compose.
- Analisis de archivos Compose para detectar variables de entorno.
- API protegida con JWT y cookies HTTP-only.
- Frontend web para autenticar, seleccionar repositorios y consultar proyectos.
- Paquete compartido con contratos TypeScript entre frontend y backend.

## Stack Tecnico

- **Backend:** NestJS, TypeScript
- **Frontend:** React, Vite, TypeScript
- **Base de datos:** PostgreSQL
- **ORM:** Prisma
- **Autenticacion:** GitHub OAuth + JWT
- **Contenedores:** Docker Compose
- **Testing:** Vitest
- **Linting/Formato:** Oxlint, Prettier

## Arquitectura General

El repositorio esta organizado como un monorepo:

```text
.
|-- apps/
|   `-- web/              # Frontend React + Vite
|-- packages/
|   `-- shared/           # Tipos y contratos compartidos
|-- prisma/               # Schema, modelos y migraciones
|-- src/                  # Backend NestJS
|   |-- auth/             # Autenticacion GitHub/JWT
|   |-- repository/       # Proyectos, repositorios y casos de uso
|   `-- shared/           # Infraestructura y utilidades compartidas
|-- test/                 # Pruebas e2e
|-- docker-compose.yml
`-- Dockerfile
```

## Requisitos

- Docker
- Docker Compose
- Una OAuth App de GitHub

No es necesario instalar PostgreSQL localmente si se usa Docker Compose.

## Configuracion de GitHub OAuth

Para iniciar sesion con GitHub, crea una OAuth App desde GitHub:

1. Entra a **GitHub Developer Settings**.
2. Crea una nueva **OAuth App**.
3. Usa estos valores para desarrollo local:

```text
Homepage URL: http://localhost:5173
Authorization callback URL: http://localhost:3000/auth/github/callback
```

4. Copia el `Client ID` y genera un `Client Secret`.

## Variables de Entorno

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Configura las variables principales:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/neoglito
ENCRYPTION_SECRET_KEY=replace-with-a-base64-encoded-32-byte-key

GITHUB_CLIENT_ID=replace-with-github-client-id
GITHUB_CLIENT_SECRET=replace-with-github-client-secret
BACKEND_URL=http://localhost:3000
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

JWT_SECRET=una-clave-larga-y-aleatoria
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:3000
NODE_TLS_REJECT_UNAUTHORIZED=1
```

Para generar una llave valida para `ENCRYPTION_SECRET_KEY`, puedes usar:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Ejecucion con Docker Compose

El camino recomendado para levantar el proyecto es Docker Compose:

```bash
docker compose up
```

Esto levanta:

- API NestJS en `http://localhost:3000`
- Frontend React/Vite en `http://localhost:5173`
- PostgreSQL en `localhost:5432`

El servicio de API ejecuta Prisma y arranca el backend en modo desarrollo. El frontend se inicia con Vite y queda disponible desde el navegador.

## Scripts Disponibles

Desde la raiz del proyecto:

```bash
npm run start:dev        # Backend en modo desarrollo
npm run build            # Compila el backend
npm run test             # Pruebas unitarias
npm run test:e2e         # Pruebas end-to-end
npm run test:cov         # Cobertura de pruebas
npm run lint             # Lint del backend
npm run prisma:generate  # Genera Prisma Client
npm run prisma:migrate   # Ejecuta migraciones en desarrollo
npm run prisma:studio    # Abre Prisma Studio
```

Frontend:

```bash
npm --workspace @neoglito/web run dev
npm --workspace @neoglito/web run build
npm --workspace @neoglito/web run preview
```

## Endpoints Principales

Autenticacion:

- `GET /auth/github` inicia el flujo OAuth con GitHub.
- `GET /auth/github/callback` recibe el callback de GitHub.
- `GET /auth/me` devuelve el usuario autenticado.

Repositorios:

- `GET /repository/all` lista repositorios del usuario autenticado.
- `POST /repository/registry` registra un repositorio.
- `POST /repository/clone` clona un repositorio.

Proyectos:

- `GET /project` lista proyectos.
- `POST /project/registry` registra un proyecto.
- `POST /project/init` clona repositorios del proyecto y analiza archivos Docker Compose.
- `POST /project/docker_files` devuelve rutas de archivos Docker/Compose y variables encontradas.

## Modelo de Datos

El dominio principal se apoya en cuatro entidades:

- `User`: usuario autenticado.
- `GitHubConnection`: datos de vinculacion con GitHub.
- `Project`: agrupador de repositorios relacionados.
- `Repository`: repositorio Git asociado a uno o mas proyectos.

## Estado Actual

Neoglito actualmente cuenta con la base funcional para autenticacion, gestion de proyectos/repositorios, clonado de codigo y analisis inicial de archivos Docker Compose. La vision del proyecto es evolucionar hacia una herramienta de observabilidad y documentacion tecnica que ayude a visualizar la comunicacion entre contenedores y endpoints en sistemas distribuidos.

## Roadmap

- Visualizacion grafica de comunicacion entre contenedores.
- Centralizacion de documentacion por endpoint.
- Deteccion mas completa de dependencias entre servicios.
- Analisis de puertos, redes y variables de entorno en Compose.
- Vistas para explorar proyectos, servicios y endpoints.
- Integracion con repositorios GitHub desde la interfaz.

## Licencia

Este proyecto esta marcado como `UNLICENSED` en `package.json`.

## Nota
Este codigo puede tener comentarios ajenos al codigo dado que lo realizo en gran medida a modo de 
aprendizaje, en caso de notar comentarios pedagogicos, simplemente ignorarlos