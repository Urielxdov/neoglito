---
tags:
  - neoglito
  - deployment
  - documentacion-tecnica
funcionalidad: deployment
actualizado: 2026-10-10
---

# Deployment · implementación y contratos

## Composición Nest

DeploymentModule importa AuthModule, PrismaModule, AnalysisModule, ContainerModule y PortModule. Registra DeploymentController y ProjectDeploymentController. No declara exports.

| Proveedor | Responsabilidad |
| --- | --- |
| DeployComposeUseCase | Validar candidato, preparar, reservar, arrancar y guardar |
| GetProjectDeploymentsUseCase | Verificar proyecto y listar registros con servicios |
| StopDeploymentUseCase | Down, liberar reservas y guardar parada |
| ClassifyDeploymentServicesUseCase | Observar, inspeccionar, clasificar y actualizar |
| GetDeploymentPortsUseCase | Leer asignaciones y metadatos guardados |
| DEPLOYMENT_COMPOSE_PORT → YamlDeploymentComposeService | Preparar YAML y recuperar su procedencia |

Los casos de uso acceden directamente a PrismaService; no existe un repositorio Deployment intermedio. Inyectan las interfaces mediante símbolos CONTAINER_RUNTIME_PORT, PORT_RESERVATION_PORT y CONTAINER_CLASSIFICATION_PORT según la operación.

## Contrato del preparador

```typescript
interface PreparedDeploymentCompose {
  composePath: string;
  projectName: string;
  publishedPorts: number[];
}

interface DeploymentComposePort {
  prepare(sourcePath: string, deploymentId: string,
    configuration: DeploymentComposeConfiguration
  ): Promise<PreparedDeploymentCompose>;
  readSource(composePath: string, deploymentId: string): Promise<{
    sourceComposePath: string | null;
    projectDirectory: string | null;
  }>;
}
```

DeploymentComposeConfiguration toma `environment`, `ports` y `mirrorPorts` de DeployComposeRequest. El token usa useClass. El preparador no ejecuta up ni guarda registros Prisma; sí puede inspeccionar mounts mediante resolveHostPath al preparar bind mounts.

## Entidades y mapeos

Deployment contiene propiedades readonly: id, projectId, composePath, status, createdAt, startedAt, finishedAt y services (`Container[]`). No implementa reglas de transición ni métodos de persistencia.

`toDeployment` reconstruye Deployment y Container desde un registro Prisma. `toDeploymentResponse` convierte fechas a ISO y fechas opcionales a null. El tipo compartido expone status/health/serviceType como string, mientras que el dominio y Prisma manejan conjuntos de valores definidos.

## Tipos y catálogo

ServiceType define BACKEND, FRONTEND, DATABASE, CACHE, MESSAGE_BROKER, WORKER, SCHEDULER, REVERSE_PROXY y UNKNOWN.

`SERVICE_IMAGE_CATALOG` indexa imágenes normalizadas. `normalizeImageRef` elimina digest, tag, registry reconocido y prefijo library, y convierte a minúsculas. Una imagen como postgres aporta DATABASE; Redis puede aportar CACHE o MESSAGE_BROKER; nginx puede aportar REVERSE_PROXY o FRONTEND. Herramientas conocidas pueden resolver explícitamente UNKNOWN. Fuera del catálogo, lookupImage devuelve undefined. La construcción del índice rechaza imágenes duplicadas.

`PROTOCOL_SERVICE_TYPES` relaciona sondas con candidatos: postgres/mysql/mongo → DATABASE; resp → CACHE o MESSAGE_BROKER; HTTP → BACKEND, FRONTEND, REVERSE_PROXY o DATABASE. La cadena de `ports` consume estas reglas junto con evidencia adicional. El catálogo no implica que toda imagen ambigua tenga un tipo definitivo.

## Fuentes del código

- [src/deployment/deployment.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/deployment.module.ts)
- [src/deployment/application/ports/deployment-compose.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/ports/deployment-compose.port.ts)
- [src/deployment/domain/entities/deployment.entity.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/domain/entities/deployment.entity.ts)
- [src/deployment/application/responses/deployment.response.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/application/responses/deployment.response.ts)
- [src/deployment/domain/value-objects/service-type.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/domain/value-objects/service-type.ts)
- [src/deployment/domain/services/service-image-catalog.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/domain/services/service-image-catalog.ts)
- [src/deployment/domain/services/protocol-service-type.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/domain/services/protocol-service-type.ts)
