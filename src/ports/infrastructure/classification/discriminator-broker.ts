import { ServiceType } from '../../../deployment/domain/value-objects/service-type.js'
import type { ContainerContext } from './classification.js'
import type { Discriminator } from './discrimination.js'

const REDIS_URL = /\b(?:rediss?|valkeys?):\/\/[^\s"',;]+/gi
const BROKER_KEY = /BROKER|QUEUE|BULL|DRAMATIQ|HUEY|(?:^|_)RQ(?:_|$)/
const CACHE_KEY = /CACHE/

/** Qué rol indica el nombre de la variable. `REDIS_URL` o `CELERY_RESULT_BACKEND` no dicen nada. */
export function roleFromEnvKey(key: string): ServiceType | null {
  const upper = key.toUpperCase()
  if (BROKER_KEY.test(upper)) return ServiceType.MESSAGE_BROKER
  if (CACHE_KEY.test(upper)) return ServiceType.CACHE
  return null
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** ¿Algún URL redis/valkey dentro de `value` apunta a uno de estos alias? */
export function referencesAny(value: string, aliases: ReadonlySet<string>): boolean {
  return (value.match(REDIS_URL) ?? []).some((url) => {
    const host = hostnameOf(url)
    return host !== null && aliases.has(host)
  })
}

/**
 * La evidencia no está en el propio Redis sino en cómo lo usan los demás contenedores.
 * Recibe todos los contenedores del entorno.
 */
export function brokerUsageDiscriminator(containers: readonly ContainerContext[]): Discriminator {
  return {
    name: 'uso por otros contenedores',
    resolves: [ServiceType.CACHE, ServiceType.MESSAGE_BROKER],
    async discriminate(ctx) {
      const aliases = new Set(ctx.aliases.map((alias) => alias.toLowerCase()))
      const types = new Set<ServiceType>()
      const references: string[] = []

      for (const other of containers) {
        if (other.id === ctx.id) continue

        for (const [key, value] of Object.entries(other.env)) {
          const role = roleFromEnvKey(key)
          if (!role || !referencesAny(value, aliases)) continue

          types.add(role)
          references.push(`${other.aliases[0] ?? other.id}.${key}`)
        }
      }

      if (types.size === 0) return null
      return { types: [...types], evidence: references.join(', ') }
    },
  }
}
