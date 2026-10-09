import { ServiceType as T } from '../../../../deployment/domain/value-objects/service-type.js'
import type { ContainerContext } from '../classification.js'
import { discriminationHandler, type Discriminator, type Finding } from '../discrimination.js'

const ctx: ContainerContext = {
  id: 'c1',
  image: 'x',
  host: '127.0.0.1',
  aliases: [],
  ports: [],
  command: [],
  env: {},
}

function fake(
  name: string,
  resolves: Discriminator['resolves'],
  finding: Finding | null,
): Discriminator & { calls: number } {
  return {
    name,
    resolves,
    calls: 0,
    async discriminate() {
      this.calls++
      return finding
    },
  }
}

describe('discriminationHandler', () => {
  it('no detiene a los siguientes cuando uno devuelve null', async () => {
    const first = fake('a', [T.CACHE, T.MESSAGE_BROKER], null)
    const second = fake('b', [T.CACHE, T.MESSAGE_BROKER], { types: [T.CACHE], evidence: 'x' })

    const verdict = await discriminationHandler([first, second]).handle(
      ctx,
      [T.CACHE, T.MESSAGE_BROKER],
      {},
    )

    expect(first.calls).toBe(1)
    expect(second.calls).toBe(1)
    expect(verdict).toEqual({ kind: 'resolved', type: T.CACHE, evidence: 'b: x' })
  })

  it('corre cada discriminador como máximo una vez', async () => {
    const same = fake('a', [T.CACHE, T.MESSAGE_BROKER], {
      types: [T.CACHE, T.MESSAGE_BROKER],
      evidence: 'ambos',
    })

    const verdict = await discriminationHandler([same]).handle(ctx, [T.CACHE, T.MESSAGE_BROKER], {})

    expect(same.calls).toBe(1)
    expect(verdict).toMatchObject({ kind: 'narrowed', candidates: [T.CACHE, T.MESSAGE_BROKER] })
  })

  it('no corre ninguno si quedan menos de 2 candidatos', async () => {
    const d = fake('a', [T.CACHE, T.MESSAGE_BROKER], { types: [T.CACHE], evidence: 'x' })

    const verdict = await discriminationHandler([d]).handle(ctx, [T.CACHE], {})

    expect(d.calls).toBe(0)
    expect(verdict).toEqual({ kind: 'pass' })
  })

  it('no corre los discriminadores cuyo conjunto no cubre todos los candidatos', async () => {
    const d = fake('a', [T.WORKER, T.SCHEDULER], { types: [T.WORKER], evidence: 'x' })

    const verdict = await discriminationHandler([d]).handle(ctx, [T.CACHE, T.MESSAGE_BROKER], {})

    expect(d.calls).toBe(0)
    expect(verdict).toEqual({ kind: 'pass' })
  })

  it('un Finding sin intersección con los candidatos produce conflict', async () => {
    const d = fake('a', [T.CACHE, T.MESSAGE_BROKER], { types: [T.DATABASE], evidence: 'raro' })

    const verdict = await discriminationHandler([d]).handle(ctx, [T.CACHE, T.MESSAGE_BROKER], {})

    expect(verdict).toEqual({
      kind: 'conflict',
      candidates: [T.CACHE, T.MESSAGE_BROKER],
      evidence: 'a: raro',
    })
  })

  it('el conflicto lleva toda la evidencia acumulada', async () => {
    const all = [T.BACKEND, T.FRONTEND, T.REVERSE_PROXY, T.DATABASE]
    const narrow = fake('http', all, { types: [T.REVERSE_PROXY, T.FRONTEND], evidence: 'nginx' })
    const clash = fake('config', [T.REVERSE_PROXY, T.FRONTEND], { types: [T.BACKEND], evidence: 'x' })

    const verdict = await discriminationHandler([narrow, clash]).handle(ctx, all, {})

    expect(verdict).toMatchObject({ kind: 'conflict', evidence: 'http: nginx · config: x' })
  })

  it('sin evidencia devuelve pass', async () => {
    const d = fake('a', [T.WORKER, T.SCHEDULER], null)

    expect(await discriminationHandler([d]).handle(ctx, [T.WORKER, T.SCHEDULER], {})).toEqual({
      kind: 'pass',
    })
  })

  it('el orden de la lista decide quién corre primero y puede cortar a los demás', async () => {
    const pair = [T.REVERSE_PROXY, T.FRONTEND]
    const first = fake('primero', pair, { types: [T.FRONTEND], evidence: 'a' })
    const second = fake('segundo', pair, { types: [T.REVERSE_PROXY], evidence: 'b' })

    const verdict = await discriminationHandler([first, second]).handle(ctx, pair, {})

    expect(second.calls).toBe(0)
    expect(verdict).toEqual({ kind: 'resolved', type: T.FRONTEND, evidence: 'primero: a' })
  })

  it('trata una excepción de un discriminador como null', async () => {
    const boom: Discriminator = {
      name: 'boom',
      resolves: [T.WORKER, T.SCHEDULER],
      discriminate: () => Promise.reject(new Error('x')),
    }
    const ok = fake('ok', [T.WORKER, T.SCHEDULER], { types: [T.WORKER], evidence: 'w' })

    const verdict = await discriminationHandler([boom, ok]).handle(ctx, [T.WORKER, T.SCHEDULER], {})

    expect(verdict).toMatchObject({ kind: 'resolved', type: T.WORKER })
  })
})
