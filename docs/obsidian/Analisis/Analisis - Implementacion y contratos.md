---
tags:
  - neoglito
  - analisis
  - documentacion-tecnica
funcionalidad: analisis
actualizado: 2026-10-10
---

# Análisis · implementación y contratos

## Módulo Nest

`AnalysisModule` importa `PrismaModule` y `RepositoryModule`. Registra `ProjectAnalysisService` y tres adaptadores mediante símbolos; exporta únicamente el servicio de análisis. No declara controladores propios. `DeploymentModule` lo importa y alberga los controladores HTTP que consumen sus métodos.

| Dependencia | Implementación / propósito |
| --- | --- |
| `PrismaService` | Consultar proyecto y relaciones |
| `CloneRepositoryUseCase` | Reutilizar o clonar cada repositorio |
| `FILE_FINDER_PORT` | `RecursiveFileFinderService`: localizar archivos |
| `ENVIROMENT_VARIABLE_EXTRACT_PORT` | `YamlComposeEnviromentVariableExtractService`: extraer variables |
| `COMPOSE_PORT_EXTRACT_PORT` | `YamlComposePortExtractService`: extraer puertos |

Los nombres `analisys` y `ENVIROMENT` reproducen la escritura del código. Para sustituir un adaptador hay que conservar el contrato y el token correspondiente.

## Métodos públicos

| Método | Parámetros | Resultado |
| --- | --- | --- |
| `getComposeFiles` | `userId: number`, `projectId: number` | `Promise<ProjectComposeFiles>` |
| `analyzeProject` | Los anteriores; opciones `{ includePorts?: boolean } = {}` | `Promise<ProjectAnalysis>` |

`userId` se usa para obtener credenciales de clonación. `projectId` identifica el proyecto consultado. `includePorts` controla la extracción; no es un parámetro expuesto por los endpoints actuales.

```typescript
interface ProjectComposeFiles {
  clonedRepositoryPaths: string[];
  dockerFilesPath: string[];
}

interface ProjectComposeAnalysis {
  dockerComposePath: string;
  environmentVariables: EnvironmentVariable[];
  ports: ComposePort[];
}

interface ProjectAnalysis extends ProjectComposeFiles {
  composeAnalyses: ProjectComposeAnalysis[];
}
```

Las rutas son las del sistema de archivos del backend. `dockerFilesPath` contiene los Compose encontrados, aunque su nombre sugiera Dockerfiles. No incluye archivos `Dockerfile` por ese solo nombre.

## Contratos de los adaptadores

```typescript
FileFinderPort.findFile(directoryPath: string, pattern: RegExp): Promise<string[]>
EnviromentVariableExtractPort.analyze(filePath: string): Promise<ComposeAnalysis>
ComposePortExtractPort.analyze(filePath: string): Promise<ComposePortAnalysis>
```

`ComposeAnalysis` contiene `environmentVariables`; `ComposePortAnalysis` contiene `ports`. Sus estructuras se explican en [[Analisis - Variables y puertos]]. Los tipos TypeScript no añaden validación de entrada en tiempo de ejecución.

## Consumo interno

```typescript
// Dentro de un proveedor que inyecta ProjectAnalysisService:
const files = await this.projectAnalysis.getComposeFiles(userId, projectId);
const full = await this.projectAnalysis.analyzeProject(userId, projectId);
const envOnly = await this.projectAnalysis.analyzeProject(userId, projectId, {
  includePorts: false,
});
```

Son ejemplos de llamadas al servicio, no scripts autónomos. El consumidor debe formar parte del grafo Nest y tener acceso a `AnalysisModule`.

## Fuentes del código

- [src/analisys/analysis.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/analysis.module.ts)
- [src/analisys/application/project-analysis.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/application/project-analysis.service.ts)
- [src/deployment/deployment.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/deployment.module.ts)
- [src/shared/application/file-finder.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/file-finder.port.ts)
- [src/shared/application/enviroment-variable-extract.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/enviroment-variable-extract.port.ts)
- [src/shared/application/compose-port-extract.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/application/compose-port-extract.port.ts)
