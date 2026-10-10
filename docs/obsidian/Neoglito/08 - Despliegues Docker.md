---
tags:
  - neoglito
  - documentacion
actualizado: 2026-10-10
tipo: documentacion-tecnica
---

# Despliegues Docker

`POST /deployment` recibe proyecto, ruta Compose y configuración opcional. El caso de uso valida que el archivo corresponda al proyecto, prepara un YAML independiente, reserva puertos TCP y utiliza el runtime Docker para construir/iniciar y observar contenedores.

## Archivo generado

`YamlDeploymentComposeService` modifica variables y publicaciones del Compose seleccionado y escribe `.neoglito/deployments/.neoglito-<deploymentId>.compose.yml`. `DEPLOYMENT_COMPOSE_DIRECTORY` permite cambiar el destino. El archivo puede contener credenciales y el directorio está excluido de Git y del contexto de build.

Una variable sin `service` se aplica a todos los servicios del archivo. Los valores se escriben como literales, incluidos los signos `$`.

Cada despliegue usa `neoglito-<deploymentId>` como nombre de proyecto y ejecuta Compose con `-p`, `--project-directory` y `-f`. Ajusta nombres explícitos de contenedores y recursos propios. Las referencias de recursos externos y bind mounts se conservan.

`x-neoglito.projectDirectory` conserva la carpeta original para resolver builds, archivos de entorno y otras rutas. `x-neoglito.sourceComposePath` permite asociar el despliegue con el archivo original. `Deployment.composePath` guarda la ruta configurada y se reutiliza al detener y clasificar.

## Puertos y listeners

El frontend envía `mirrorPorts: true`: el número elegido se aplica al puerto publicado y al listener interno. El preparador ajusta `PORT`, parámetros conocidos de Vite/Redis/PostgreSQL, healthchecks y URLs internas. Si no reconoce cómo cambiar el listener, rechaza la configuración con un mensaje. Si se omite `mirrorPorts`, se conserva el mapeo host/contenedor original.

Un puerto host vacío permite asignación por Docker. Los rangos reservan cada puerto; datos inválidos o repetidos fallan antes de ejecutar Docker. Ante un arranque parcial fallido se intenta detener el proyecto creado.

## Operación posterior

Consulta despliegues con `GET /deployment/project/:projectId`. `POST /deployment/:deploymentId/stop` ejecuta Compose down y actualiza estados. La clasificación es una operación explícita descrita en [[09 - Puertos y clasificacion]].

Cuando la API está dentro de Docker, las rutas de bind mounts se traducen a rutas del host del daemon a partir de los mounts de la API. Esto importa porque Docker usa el sistema de archivos del host, aunque el cliente Compose se ejecute en `/app`.

## Fuentes del repositorio

- [src/deployment/infrastructure/compose/README.md](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/infrastructure/compose/README.md)
- [src/deployment/application/use-cases/deploy-compose.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/use-cases/deploy-compose.use-case.ts)
- [src/container/infrastructure/docker/docker-compose-runtime.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/container/infrastructure/docker/docker-compose-runtime.service.ts)
