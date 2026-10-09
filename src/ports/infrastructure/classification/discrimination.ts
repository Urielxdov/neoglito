import type { ServiceType } from '../../../deployment/domain/value-objects/service-type.js'
import {
  narrowTo,
  type ClassificationFacts,
  type ClassificationHandler,
  type ContainerContext,
  type Verdict,
} from './classification.js'

/** Qué tipos respalda la evidencia encontrada. El veredicto lo calcula el runner. */
export interface Finding {
  readonly types: readonly ServiceType[]
  readonly evidence: string
}

export interface Discriminator {
  readonly name: string
  /** Se activa si quedan 2+ candidatos y TODOS están en este conjunto. */
  readonly resolves: readonly ServiceType[]
  /** null = no encontró evidencia. */
  discriminate(
    ctx: ContainerContext,
    candidates: readonly ServiceType[],
    facts: ClassificationFacts,
  ): Promise<Finding | null>
}

/**
 * Corre los discriminadores aplicables, en el orden recibido y a lo sumo una vez cada uno,
 * mientras queden 2 o más candidatos.
 */
export function discriminationHandler(
  discriminators: readonly Discriminator[],
): ClassificationHandler {
  return {
    async handle(ctx, candidates, facts): Promise<Verdict> {
      const pending = [...discriminators]
      const evidence: string[] = []
      let current = candidates

      while (current.length >= 2) {
        const index = pending.findIndex((d) => current.every((type) => d.resolves.includes(type)))
        if (index === -1) break

        const [discriminator] = pending.splice(index, 1)
        const finding = await discriminator.discriminate(ctx, current, facts).catch(() => null)
        if (!finding) continue

        const entry = `${discriminator.name}: ${finding.evidence}`
        evidence.push(entry)

        const verdict = narrowTo(current, finding.types, entry)
        if (verdict.kind === 'conflict') {
          return { ...verdict, evidence: evidence.join(' · ') }
        }
        current = verdict.kind === 'resolved' ? [verdict.type] : verdict.candidates
      }

      if (evidence.length === 0) return { kind: 'pass' }
      return narrowTo(candidates, current, evidence.join(' · '))
    },
  }
}
