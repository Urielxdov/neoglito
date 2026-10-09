import { ServiceType } from '../../../deployment/domain/value-objects/service-type.js'
import type { Discriminator, Finding } from './discrimination.js'

interface CommandPattern {
  readonly name: string
  readonly pattern: RegExp
}

// Flag corto con B (-B, -EB) o --beat: celery worker lo usa para embeber el scheduler.
const CELERY_EMBEDDED_BEAT =
  /^(?=.*\bcelery\b)(?=.*\bworker\b)(?=.*(?<![\w-])(?:-[A-Za-z]*B[A-Za-z]*|--beat)(?![\w-]))/s

// `cron` o `crond` como palabra completa: `crontab` o `cron_app` no cuentan.
const CRON_DAEMON = /(?:^|[\s/'";&|(])crond?(?=$|[\s'";&|)])/

export const SCHEDULER_PATTERNS: readonly CommandPattern[] = [
  { name: 'celery beat', pattern: /\bcelery\b.*\bbeat\b/ },
  { name: 'celery worker -B', pattern: CELERY_EMBEDDED_BEAT },
  { name: 'ofelia', pattern: /\bofelia\b/ },
  { name: 'supercronic', pattern: /\bsupercronic\b/ },
  { name: 'cron', pattern: CRON_DAEMON },
  { name: 'rqscheduler', pattern: /\brqscheduler\b/ },
  { name: 'airflow scheduler', pattern: /\bairflow\b.*\bscheduler\b/ },
]

export const WORKER_PATTERNS: readonly CommandPattern[] = [
  { name: 'celery worker', pattern: /\bcelery\b.*\bworker\b/ },
  { name: 'rq worker', pattern: /\brqworker\b|\brq\b.*\bworker\b/ },
  { name: 'dramatiq', pattern: /\bdramatiq\b/ },
  { name: 'arq', pattern: /\barq\b/ },
  { name: 'huey_consumer', pattern: /\bhuey_consumer\b/ },
  { name: 'django-q', pattern: /\bqcluster\b/ },
  { name: 'sidekiq', pattern: /\bsidekiq\b/ },
]

const matching = (patterns: readonly CommandPattern[], command: string): string[] =>
  patterns.filter(({ pattern }) => pattern.test(command)).map(({ name }) => name)

/** Función pura: el comando (ya unido) → hallazgo, o null si no reconoce nada. */
export function findingFromCommand(command: string): Finding | null {
  const schedulers = matching(SCHEDULER_PATTERNS, command)
  const workers = matching(WORKER_PATTERNS, command)

  const types: ServiceType[] = []
  if (workers.length > 0) types.push(ServiceType.WORKER)
  if (schedulers.length > 0) types.push(ServiceType.SCHEDULER)
  if (types.length === 0) return null

  return { types, evidence: [...workers, ...schedulers].join(', ') }
}

export const commandDiscriminator: Discriminator = {
  name: 'comando',
  resolves: [ServiceType.WORKER, ServiceType.SCHEDULER],
  async discriminate(ctx) {
    return findingFromCommand(ctx.command.join(' '))
  },
}
