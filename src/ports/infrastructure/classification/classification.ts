import { Logger } from '@nestjs/common';
import { ServiceType } from '../../../deployment/domain/value-objects/service-type.js';
import type {
  Classification,
  ContainerContext,
} from '../../application/container-classification.port.js';
import type { PortResult } from '../probing/port-identification.js';

const logger = new Logger('ContainerClassification');

export type { PortResult };
export type {
  Classification,
  ContainerContext,
} from '../../application/container-classification.port.js';

export interface ClassificationFacts {
  /** Lo escribe el eslabón de protocolo. */
  ports?: readonly PortResult[];
}

export type Verdict =
  | { kind: 'resolved'; type: ServiceType; evidence: string }
  | { kind: 'narrowed'; candidates: readonly ServiceType[]; evidence: string }
  | { kind: 'conflict'; candidates: readonly ServiceType[]; evidence: string }
  | { kind: 'pass' };

export interface ClassificationHandler {
  handle(
    ctx: ContainerContext,
    candidates: readonly ServiceType[],
    facts: ClassificationFacts,
  ): Promise<Verdict>;
}

/**
 * Cruza candidatos con los tipos que respalda una evidencia:
 * 0 restantes → conflict, 1 → resolved, 2+ → narrowed.
 */
export function narrowTo(
  candidates: readonly ServiceType[],
  supported: readonly ServiceType[],
  evidence: string,
): Exclude<Verdict, { kind: 'pass' }> {
  const remaining = candidates.filter((type) => supported.includes(type));
  if (remaining.length === 0) return { kind: 'conflict', candidates, evidence };
  if (remaining.length === 1)
    return { kind: 'resolved', type: remaining[0], evidence };
  return { kind: 'narrowed', candidates: remaining, evidence };
}

const ALL_TYPES: readonly ServiceType[] = Object.values(ServiceType).filter(
  (type) => type !== ServiceType.UNKNOWN,
);

/** Recorre la cadena de responsabilidad: cada eslabón recibe los candidatos que dejó el anterior. */
export async function classify(
  ctx: ContainerContext,
  handlers: readonly ClassificationHandler[],
): Promise<Classification> {
  const facts: ClassificationFacts = {};
  const evidence: string[] = [];
  let candidates = ALL_TYPES;

  for (const handler of handlers) {
    const verdict = await handler.handle(ctx, candidates, facts);
    logger.debug(
      `[${ctx.id}] veredicto: ${verdict.kind}` +
        (verdict.kind === 'pass' ? '' : `: ${verdict.evidence}`),
    );
    if (verdict.kind === 'pass') continue;

    evidence.push(verdict.evidence);
    if (verdict.kind === 'conflict') {
      logger.debug(
        `[${ctx.id}] conflict final: candidatos=[${verdict.candidates.join(',')}]`,
      );
      return { kind: 'conflict', candidates: verdict.candidates, evidence };
    }
    if (verdict.kind === 'resolved') {
      return { kind: 'resolved', type: verdict.type, evidence };
    }
    candidates = verdict.candidates;
  }

  if (candidates.length === ALL_TYPES.length) {
    logger.debug(`[${ctx.id}] ningún handler aportó evidencia -> unknown`);
    return { kind: 'unknown', evidence };
  }
  if (candidates.length === 1)
    return { kind: 'resolved', type: candidates[0], evidence };
  logger.debug(
    `[${ctx.id}] ambiguous final: candidatos=[${candidates.join(',')}]`,
  );
  return { kind: 'ambiguous', candidates, evidence };
}
