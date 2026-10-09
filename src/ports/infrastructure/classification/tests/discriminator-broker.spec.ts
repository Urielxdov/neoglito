import { ServiceType as T } from '../../../../deployment/domain/value-objects/service-type.js'
import type { ContainerContext } from '../classification.js'
import { brokerUsageDiscriminator } from '../discriminator-broker.js'

const container = (
  id: string,
  aliases: string[],
  env: Record<string, string> = {},
): ContainerContext => ({ id, image: 'x', host: 'h', aliases, ports: [], command: [], env })

const redis = container('redis-id', ['redis'])

const run = (others: ContainerContext[], self = redis) =>
  brokerUsageDiscriminator([self, ...others]).discriminate(self, [], {})

describe('brokerUsageDiscriminator', () => {
  it('CELERY_BROKER_URL apuntando a su alias → MESSAGE_BROKER', async () => {
    const worker = container('w', ['worker'], { CELERY_BROKER_URL: 'redis://redis:6379/0' })

    const finding = await run([worker])

    expect(finding?.types).toEqual([T.MESSAGE_BROKER])
    expect(finding?.evidence).toBe('worker.CELERY_BROKER_URL')
  })

  it('solo CACHE_URL → CACHE', async () => {
    const api = container('a', ['api'], { CACHE_URL: 'redis://redis:6379/1' })

    expect((await run([api]))?.types).toEqual([T.CACHE])
  })

  it('REDIS_URL o CELERY_RESULT_BACKEND no dicen nada del rol → null', async () => {
    const api = container('a', ['api'], {
      REDIS_URL: 'redis://redis:6379/0',
      CELERY_RESULT_BACKEND: 'redis://redis:6379/1',
    })

    expect(await run([api])).toBeNull()
  })

  it('broker y cache a la vez → ambos (ambiguo)', async () => {
    const api = container('a', ['api'], {
      CELERY_BROKER_URL: 'redis://redis:6379/0',
      CACHE_URL: 'redis://redis:6379/1',
    })

    expect((await run([api]))?.types).toEqual([T.MESSAGE_BROKER, T.CACHE])
  })

  it('el propio contenedor no cuenta como referencia', async () => {
    const self = container('redis-id', ['redis'], { CELERY_BROKER_URL: 'redis://redis:6379/0' })

    expect(await run([], self)).toBeNull()
  })

  it('una URL a otro host no cuenta', async () => {
    const api = container('a', ['api'], { CELERY_BROKER_URL: 'redis://otro-redis:6379/0' })

    expect(await run([api])).toBeNull()
  })

  it('acepta rediss/valkey, mayúsculas, credenciales y varias URLs en un valor', async () => {
    const api = container('a', ['api'], {
      BULL_CONNECTION: 'redis://x:y@other:1/0,valkey://:pw@REDIS:6379',
      QUEUE_URL: 'rediss://redis:6380',
    })

    const finding = await run([api])

    expect(finding?.types).toEqual([T.MESSAGE_BROKER])
    expect(finding?.evidence).toBe('api.BULL_CONNECTION, api.QUEUE_URL')
  })

  it('reconoce RQ solo como palabra', async () => {
    const rq = container('a', ['api'], { RQ_URL: 'redis://redis' })
    const notRq = container('b', ['b'], { ARQUITECTURA_URL: 'redis://redis' })

    expect((await run([rq]))?.types).toEqual([T.MESSAGE_BROKER])
    expect(await run([notRq])).toBeNull()
  })

  it('una URL malformada se ignora sin lanzar', async () => {
    const api = container('a', ['api'], { CELERY_BROKER_URL: 'redis://[::bad' })

    expect(await run([api])).toBeNull()
  })
})
