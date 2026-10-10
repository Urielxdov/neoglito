---
tags:
  - neoglito
  - repository
  - documentacion-tecnica
funcionalidad: Repository
actualizado: 2026-10-10
---

# Repository · flujos

## Listar repositorios remotos

```mermaid
sequenceDiagram
    participant C as Cliente
    participant H as RepositoryController
    participant U as GetRepositoriesUseCase
    participant P as Prisma
    participant E as EncryptionPort
    participant G as GitHub
    C->>H: GET /repository/all con JWT
    H->>U: execute(request.user.id)
    U->>P: gitHubConnection.findUnique por userId
    P-->>U: Conexión con token cifrado
    U->>E: decrypt(accessToken)
    E-->>U: Token utilizable en memoria
    U->>G: GET /user/repos?per_page=100
    G-->>U: Array JSON
    U->>U: Mapear contratos y valores nulos
    U-->>C: 200, data RepositoryResponse[]
```

Si falta conexión, se devuelve 404 antes del descifrado. Si GitHub responde un estado no exitoso, se devuelve 502. El listado no lee la tabla Repository ni sincroniza sus registros. El JWT identifica al usuario local; el token descifrado es el que se envía a GitHub.

## Registrar y vincular

```mermaid
sequenceDiagram
    participant C as Cliente
    participant U as CreateRepositoryUseCase
    participant P as ProjectRepository
    participant R as RepositoryRepository
    participant DB as Prisma/PostgreSQL
    C->>U: projectId, id, name, gitUrl, cloneUrl
    U->>U: Recortar cadenas y validar ids positivos
    U->>P: findById(projectId)
    U->>R: findByProjectIdAndCloneUrl
    alt Mismo cloneUrl ya vinculado
        U-->>C: 409
    else Sin vínculo duplicado
        U->>R: save(Repository con projectIds=[projectId])
        R->>DB: upsert por id y connect del proyecto
        DB-->>U: Registro y vínculos actuales
        U-->>C: 201, CreateRepositoryResponse
    end
```

No se hace una consulta GitHub para validar que el id o las URLs correspondan al usuario. El request se limita a metadatos y vínculo. Un id ya existente puede actualizar su nombre y URLs globalmente, además de agregar el proyecto recibido.

## Clonar o reutilizar

```mermaid
flowchart TD
    A[POST repository/clone con JWT] --> B[Validar cloneUrl y obtener nombre]
    B --> C[Buscar conexión por userId]
    C --> D[Validar username y construir destino]
    D --> E{access destino exitoso?}
    E -->|Sí| F[Devolver destino existente]
    E -->|No| G[Descifrar accessToken]
    G --> H[Crear ASKPASS temporal]
    H --> I[Ejecutar git clone]
    I --> J[Limpiar directorio temporal en finally]
    J --> K[Devolver pathSystem o propagar error]
```

La conexión se exige incluso si el destino ya existe. En cambio, el token solo se descifra cuando no se puede acceder al destino. No hay lectura de Repository ni Project en este caso de uso.

## Uso desde análisis

ProjectAnalysisService carga un proyecto con repositories desde Prisma y llama `CloneRepositoryUseCase.execute(userId, {cloneUrl})` para cada vínculo mediante Promise.all. Luego busca y analiza Compose bajo las rutas obtenidas. Un fallo no cancela automáticamente las clonaciones restantes ni borra las que ya terminaron. [[Analisis - Flujo]] describe el recorrido posterior.

Volver a [[Repository - Indice]].

## Fuentes del código

- [src/repository/application/use-cases/repository/get-repositories.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/get-repositories.use-case.ts)
- [src/repository/application/use-cases/repository/create-repository.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/create-repository.use-case.ts)
- [src/repository/application/use-cases/repository/clone-repository.use-case.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/repository/application/use-cases/repository/clone-repository.use-case.ts)
- [src/analisys/application/project-analysis.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/analisys/application/project-analysis.service.ts)
