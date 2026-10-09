# Clasificación de contenedores

El endpoint `POST /deployment/:deploymentId/classify` ejecuta
`ClassifyDeploymentServicesUseCase`. El caso de uso observa los contenedores del
Compose, exige que los servicios registrados sigan en `running` y obtiene sus
metadatos mediante `ContainerRuntimePort.inspect()`.

`ContainerClassificationService`, registrado como `CONTAINER_CLASSIFICATION_PORT`
en `PortModule`, recibe todas las inspecciones y arma esta cadena:

```text
imagen → protocolo → discriminadores aplicables → Classification
```

- `handler-image.ts`: consulta el catálogo de imágenes. Una categoría única
  resuelve inmediatamente, incluyendo las herramientas catalogadas como UNKNOWN.
- `handler-protocol.ts`: reutiliza `ContainerProbePort`, guarda los resultados en
  `facts.ports` y acota candidatos usando `PROTOCOL_SERVICE_TYPES`.
- `discrimination.ts`: ejecuta, en orden, huellas HTTP, configuración de servidor
  web, referencias de otros contenedores y comando. Solo aplica un discriminador
  cuando admite todos los candidatos restantes.

Cada handler puede pasar, acotar, resolver o indicar conflicto. La cadena termina
al resolver o encontrar conflicto. Al agotarse, devuelve `ambiguous` si acotó
opciones y `unknown` si no pudo reducirlas.

Las sondas y las huellas HTTP usan `CONTAINER_PROBE_HOST` (por defecto
`127.0.0.1`) y los puertos TCP publicados. Los archivos de configuración se
consultan con `docker exec` mediante el runtime. Los aliases y variables de todos
los contenedores permiten distinguir Redis usado como cache o broker.

Un servicio sin puertos publicados puede resolverse por imagen, configuración,
uso o comando. La ausencia de publicación no se interpreta como ausencia de
listeners internos. Si reconoce un comando de tarea, la cadena acota a
WORKER/SCHEDULER y el discriminador de comando decide entre ellos.

El caso de uso guarda `classification.type` cuando el resultado es `resolved`, y
`UNKNOWN` para `ambiguous`, `conflict` o `unknown`. Se conserva el modelo Prisma
actual: candidatos y evidencia no se persisten. `port: 0` representa un servicio
sin publicación; no se reserva ni se restaura ese valor en Redis.
