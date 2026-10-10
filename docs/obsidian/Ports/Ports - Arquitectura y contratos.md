---
tags:
  - neoglito
  - ports
  - documentacion-tecnica
funcionalidad: ports
actualizado: 2026-10-10
---

# Ports · arquitectura y contratos

## Registro de proveedores

PortModule importa CacheModule y ContainerModule y registra PortController. Publica tres símbolos mediante useExisting: cada símbolo reutiliza la instancia de su clase, en lugar de crear un segundo proveedor.

| Token exportado | Implementación | Responsabilidad |
| --- | --- | --- |
| PORT_RESERVATION_PORT | RedisPortReservationService | Reservas y holds TCP |
| CONTAINER_PROBE_PORT | TcpContainerProbeService | Identificación de protocolos |
| CONTAINER_CLASSIFICATION_PORT | ContainerClassificationService | Clasificación del conjunto de inspecciones |

CacheModule exporta RedisConnection y CACHE_PORT; las reservas usan directamente RedisConnection.client y sus scripts Lua, no RedisCache. ContainerClassificationService inyecta runtime y probe. PortController solo inyecta el contrato de reservas.

## Contrato de reservas

```typescript
interface PortReservationPort {
  getAll(): Promise<PortReservationsResponse>;
  reservePort(port: number, ownerId: string, ttlSeconds?: number): Promise<boolean>;
  holdPort(port: number, ownerId: string, timeoutMs?: number): Promise<HeldPortReservation | null>;
  restorePort(port: number, ownerId: string): Promise<boolean>;
  releasePort(ownerId: string): Promise<boolean>;
}
interface HeldPortReservation {
  port: number;
  ownerId: string;
  handoff(): Promise<void>;
  handoff<T>(operation: () => Promise<T>): Promise<T>;
  release(): Promise<boolean>;
}
```

false/null señala rechazo previsto por validación o conflicto. Errores Redis y ciertos errores de cierre se propagan como excepciones: no todo fallo se convierte en boolean.

## Contrato de sondeo

`probe(ports: readonly number[], host?: string)` devuelve `{outcome, ports}`. TcpContainerProbeService toma el host predeterminado de CONTAINER_PROBE_HOST o 127.0.0.1. Un host explícito sustituye ese valor.

PortResult es closed, unidentified o identified con protocol. ProbeOutcome es no_listeners, unidentified o identified con protocolos deduplicados. El contrato identifica la respuesta observada por red; no devuelve ServiceType.

## Contrato de clasificación

`classify(containers: readonly ContainerInspection[])` devuelve un resultado por containerId. Cada inspección incluye image, aliases, todos los TCP publicados, command y env. El servicio los convierte en ContainerContext añadiendo id y host.

```typescript
type Classification =
  | { kind: 'resolved'; type: ServiceType; evidence: readonly string[] }
  | { kind: 'ambiguous'; candidates: readonly ServiceType[]; evidence: readonly string[] }
  | { kind: 'conflict'; candidates: readonly ServiceType[]; evidence: readonly string[] }
  | { kind: 'unknown'; evidence: readonly string[] };
```

El conjunto completo permite estudiar referencias de otros contenedores. No recibe una ruta Compose ni llama a list/inspect: esas acciones las realiza el caso de uso de Deployment antes de invocarlo.

## Consumidores

| Consumidor | Uso |
| --- | --- |
| PortController | Listar, reservar draft y liberar draft |
| DeployComposeUseCase | Liberar draft, hold/handoff y restore por containerId |
| StopDeploymentUseCase | Liberar por containerId |
| RestoreDeploymentPortReservationsService | restore de servicios guardados al arrancar |
| ClassifyDeploymentServicesUseCase | clasificar inspecciones y guardar tipos |

Dos estructuras se llaman ContainerContext: el sondeo solo requiere host/ports; la clasificación incluye metadatos adicionales. También debe distinguirse `ports` como módulo Nest del concepto de interfaz o puerto de arquitectura usado en nombres como ContainerRuntimePort.

Volver a [[Ports - Indice]].

## Fuentes del código

- [src/ports/port.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/port.module.ts)
- [src/ports/application/port-reservation.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/application/port-reservation.port.ts)
- [src/ports/application/container-probe.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/application/container-probe.port.ts)
- [src/ports/application/container-classification.port.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/application/container-classification.port.ts)
- [src/shared/infrastructure/cache/cache.module.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/shared/infrastructure/cache/cache.module.ts)
- [src/ports/infrastructure/probing/port-identification.ts](file:///C:/Users/Uriel-Galvan/Documents/Proyectos%20Programacion/neoglito/src/ports/infrastructure/probing/port-identification.ts)
