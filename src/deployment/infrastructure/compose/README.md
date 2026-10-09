El botón **Analizar** envía `projectId`, `composePath`, `ports` y `environment`
a `POST /deployment`. Las filas descubiertas conservan su servicio y archivo
Compose. Una variable agregada sin servicio se aplica a todos los servicios
del archivo seleccionado.

`YamlDeploymentComposeService` lee el Compose autorizado y modifica sus
secciones `environment` y `ports` directamente. Conserva las variables no
sobrescritas, el puerto interno y las opciones de las publicaciones originales.
Los valores enviados se escriben como literales, incluidos los signos `$`.

El YAML resultante se guarda en
`.neoglito/deployments/.neoglito-<deploymentId>.compose.yml`, fuera de los
repositorios clonados. Se puede cambiar el directorio con
`DEPLOYMENT_COMPOSE_DIRECTORY`. Puede contener credenciales, por lo que este
directorio queda excluido de Git y del contexto de construcción de Neoglito.
La extensión `x-neoglito.projectDirectory` conserva el directorio del Compose
original para resolver builds, volúmenes, archivos de entorno y otras rutas.

Cada despliegue usa `name: neoglito-<deploymentId>` y el argumento explícito
`docker compose -p ... --project-directory ... -f ...`. `-p` fija la identidad
incluso si el entorno del backend contiene otro `COMPOSE_PROJECT_NAME`.
Ver [precedencia del nombre de proyecto en Docker](https://docs.docker.com/compose/how-tos/project-name/).
Los nombres explícitos de contenedores y de redes/volúmenes propios se ajustan
al despliegue. Los recursos externos y los bind mounts mantienen sus referencias.

El caso de uso reserva los puertos TCP del YAML modificado antes de arrancar.
Un puerto de host vacío permite que Docker lo asigne; los rangos reservan cada
puerto. Los datos inválidos y los puertos repetidos producen un error antes de
ejecutar Docker. Si el arranque falla parcialmente, se intenta detener ese
proyecto independiente.

El frontend envía `mirrorPorts: true`: el puerto elegido se usa como puerto
publicado y como puerto interno. El preparador configura `PORT` para las
aplicaciones que lo admiten, `--port` para Vite/Redis y `-p`/`PGPORT` para
PostgreSQL; también ajusta healthchecks y URLs que apuntan a servicios del mismo
Compose. Si no reconoce cómo cambiar un listener, rechaza el despliegue con un
mensaje para configurarlo; no publica un puerto interno donde nadie escucha.
Los clientes que omiten `mirrorPorts` conservan el mapeo host/contenedor original.

Cuando la API ejecuta Docker desde su propio contenedor, los bind mounts del
repositorio se traducen a las rutas del host del daemon usando los mounts de la
API. El contexto de build y los archivos leídos por Compose mantienen sus rutas
del cliente. Ver [bind mounts y host del daemon](https://docs.docker.com/engine/storage/bind-mounts/).

`Deployment.composePath` guarda el archivo configurado. La clasificación y la
detención usan ese mismo archivo y nombre de proyecto. Los registros anteriores
que apuntan al Compose original conservan su selección de proyecto previa.

Al abrir la configuración de despliegue, el frontend lista los deployments del
proyecto y consulta `GET /deployment/:deploymentId/ports` para los activos.
El endpoint devuelve los puertos guardados en `DeploymentService`; no ejecuta
Docker ni reserva puertos. Los servicios sin puerto y los deployments detenidos
o fallidos devuelven `null` como asignación.

`x-neoglito.sourceComposePath` permite asociar cada deployment con su archivo
original. Para archivos generados anteriormente se usa `projectDirectory` solo
si existe un único candidato en ese directorio. El formulario muestra los puertos
asignados en inputs deshabilitados y evita reservarlos de nuevo. Si la consulta
falla, bloquea temporalmente los inputs y ofrece reintentar. El modelo actual
guarda un puerto TCP por servicio: no se infieren asignaciones para múltiples
publicaciones de un mismo servicio.
