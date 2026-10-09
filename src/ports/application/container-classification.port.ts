import type { ContainerInspection } from '../../container/application/container-runtime.port.js';
import type { ServiceType } from '../../deployment/domain/value-objects/service-type.js';

export const CONTAINER_CLASSIFICATION_PORT = Symbol(
  'CONTAINER_CLASSIFICATION_PORT',
);

export interface ContainerContext {
  readonly id: string;
  readonly image: string;
  /** Host alcanzable desde el clasificador para los puertos publicados. */
  readonly host: string;
  readonly aliases: readonly string[];
  readonly ports: readonly number[];
  /** Entrypoint seguido de Cmd. */
  readonly command: readonly string[];
  readonly env: Readonly<Record<string, string>>;
}

export type Classification =
  | { kind: 'resolved'; type: ServiceType; evidence: readonly string[] }
  | {
      kind: 'ambiguous';
      candidates: readonly ServiceType[];
      evidence: readonly string[];
    }
  | {
      kind: 'conflict';
      candidates: readonly ServiceType[];
      evidence: readonly string[];
    }
  | { kind: 'unknown'; evidence: readonly string[] };

export interface ContainerClassification {
  readonly containerId: string;
  readonly classification: Classification;
}

/** Clasifica el conjunto completo para poder evaluar referencias entre contenedores. */
export interface ContainerClassificationPort {
  classify(
    containers: readonly ContainerInspection[],
  ): Promise<ContainerClassification[]>;
}
