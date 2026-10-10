---
tags:
  - neoglito
  - deployment
  - documentacion-tecnica
funcionalidad: deployment
actualizado: 2026-10-10
---

# Deployment · uso y frontend

## Uso HTTP

1. Autenticarse y obtener cookie o JWT.
2. POST /deployment/docker_files con projectId para obtener candidatos, variables y mappings.
3. Elegir una ruta exacta del backend y completar configuración.
4. POST /deployment y conservar data.id.
5. POST /deployment/:id/classify si se necesitan categorías actualizadas.
6. GET /deployment/project/:projectId y GET /deployment/:id/ports para consultar registros.
7. POST /deployment/:id/stop para detener el proyecto generado.

Ejemplo con mapping previamente descubierto para api, target 3000 TCP y hostIp null:

```http
POST /deployment
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "projectId": 12,
  "composePath": "/app/repo/usuario/api/docker-compose.yml",
  "mirrorPorts": false,
  "environment": [{"service": "api", "key": "MODE", "value": "development"}],
  "ports": [{
    "service": "api", "hostIp": null,
    "publishedPort": "8080", "targetPort": "3000",
    "protocol": "tcp", "mappingType": "one-to-one"
  }]
}
```

El path pertenece al servidor. Si el Compose original no contiene ese mapping, la petición se rechaza. Con false la aplicación sigue escuchando en 3000 y Docker publica 8080. El servidor no exige una reserva provisional previa del formulario: intenta holdPort durante el despliegue.

## Construcción de la petición web

createDeploymentRequest filtra variables por dockerComposePath; incluye también filas sin ruta. Bloquea valores required vacíos tras trim, omite keys vacías y conserva los values suministrados. Filtra ports al archivo elegido, elimina metadatos de descubrimiento y convierte published vacío a null. Envía **mirrorPorts true**.

El filtro frontend normaliza separadores pero mantiene mayúsculas; difiere de la comparación backend. Required es una comprobación del formulario, no una regla automática del DTO backend.

## Botón Analizar

useProjectAnalysis toma un Compose seleccionado por repositorio y llama deployAndClassify para cada destino con ruta no vacía. Las solicitudes de repositorios se lanzan sin esperar a que termine el anterior.

deployAndClassify primero despliega. Si la respuesta falla, no clasifica. Si desplegar funciona, usa el ID recibido para clasificar. Si clasificar falla, conserva la respuesta del despliegue y añade classificationError; la UI mantiene los servicios visibles con ese mensaje. No detiene ni revierte el despliegue por ese fallo.

Tras resolver invalida consultas de reservas y asignaciones de puertos. Cerrar el análisis cambia el estado de la interfaz; no llama a stop. El nombre del botón representa un flujo que sí crea contenedores.

## Puertos asignados en el formulario

loadProjectDeploymentPorts lista deployments, filtra building/starting/running y consulta /ports para cada ID. Propaga fallos de consulta en lugar de asumir que los puertos están libres.

assignedDeploymentPort asocia sourceComposePath al archivo y nombre del servicio. Para archivos generados antiguos permite fallback por projectDirectory solo si hay un único candidato en ese directorio. Toma el deployment coincidente más reciente; no usa uno anterior para rellenar un puerto faltante del nuevo.

Solo infiere asignación si hay un único mapping TCP del servicio, mappingType one-to-one y un único puerto positivo guardado. No copia el único port ORM sobre varios mappings ni UDP. La consulta no constituye una observación en vivo de Docker.

deploymentService ofrece deploy, classify, deployAndClassify, listByProject y getPorts. No define un método stop; la parada sí está disponible en el backend para un consumidor HTTP.

## Fuentes del código

- [apps/web/src/features/projects/deployment.service.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/deployment.service.ts)
- [apps/web/src/features/projects/deployment-request.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/deployment-request.ts)
- [apps/web/src/features/projects/deployment-assigned-ports.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/deployment-assigned-ports.ts)
- [apps/web/src/features/projects/hooks/use-project-analysis.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/apps/web/src/features/projects/hooks/use-project-analysis.ts)
- [src/deployment/presentation/deployment.controller.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/deployment/presentation/deployment.controller.ts)
