import * as net from 'node:net'
import { PROBES, type Protocol } from './protocol-probes.js'

const CONNECT_TIMEOUT_MS = 1000
const BANNER_WAIT_MS = 300
const RESPONSE_TIMEOUT_MS = 1000

export type PortResult =
  | { port: number; status: 'closed' }
  | { port: number; status: 'unidentified' }
  | { port: number; status: 'identified'; protocol: Protocol }

export type ProbeOutcome =
  | { kind: 'no_listeners' }
  | { kind: 'unidentified' }
  | { kind: 'identified'; protocols: Protocol[] }

export interface ContainerContext {
  host: string
  ports: readonly number[]
}

// ── 1. Transporte: el único lugar que abre sockets ────────────
type Exchange = { connected: false } | { connected: true; data: Buffer }

/** Conecta, opcionalmente envía `payload` y devuelve el primer bloque de respuesta (o vacío si no llega). */
function exchange(host: string, port: number, payload: Buffer | null, readMs: number): Promise<Exchange> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })
    let connected = false
    let settled = false

    const finish = (data?: Buffer) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(connected ? { connected: true, data: data ?? Buffer.alloc(0) } : { connected: false })
    }

    socket.setTimeout(CONNECT_TIMEOUT_MS)
    socket.once('connect', () => {
      connected = true
      socket.setTimeout(readMs)
      if (payload) socket.write(payload)
    })
    socket.once('data', (chunk: Buffer) => finish(chunk))
    socket.once('timeout', () => finish())
    socket.once('error', () => finish())
    socket.once('close', () => finish())
  })
}

// ── 2. Un puerto: escuchar primero, hablar después ────────────
export async function identifyPort(
  host: string,
  port: number,
  allowed: readonly Protocol[],
): Promise<PortResult> {
  // a) Conectar sin enviar nada y esperar un banner.
  const opening = await exchange(host, port, null, BANNER_WAIT_MS)
  if (!opening.connected) return { port, status: 'closed' }

  // b) Si el servidor habló primero, solo las sondas server-first pueden reconocerlo.
  if (opening.data.length > 0) {
    for (const protocol of allowed) {
      const probe = PROBES[protocol]
      if (probe.speaksFirst === 'server' && probe.matchBanner(opening.data)) {
        return { port, status: 'identified', protocol }
      }
    }
    return { port, status: 'unidentified' }
  }

  // c) Silencio: probar las sondas client-first, una conexión nueva por intento,
  //    en el orden recibido en `allowed`.
  for (const protocol of allowed) {
    const probe = PROBES[protocol]
    if (probe.speaksFirst !== 'client') continue

    const reply = await exchange(host, port, probe.request(host), RESPONSE_TIMEOUT_MS)
    if (reply.connected && reply.data.length > 0 && probe.matchResponse(reply.data)) {
      return { port, status: 'identified', protocol }
    }
  }
  return { port, status: 'unidentified' }
}

// ── 3. Un contenedor: todos sus puertos → ProbeOutcome ────────
export async function probeContainer(
  ctx: ContainerContext,
  allowed: readonly Protocol[],
): Promise<{ outcome: ProbeOutcome; ports: PortResult[] }> {
  if (ctx.ports.length === 0) return { outcome: { kind: 'no_listeners' }, ports: [] }

  const ports = await Promise.all(ctx.ports.map((port) => identifyPort(ctx.host, port, allowed)))
  const protocols = [...new Set(ports.flatMap((r) => (r.status === 'identified' ? [r.protocol] : [])))]

  let outcome: ProbeOutcome
  if (ports.every((r) => r.status === 'closed')) outcome = { kind: 'no_listeners' }
  else if (protocols.length === 0) outcome = { kind: 'unidentified' }
  else outcome = { kind: 'identified', protocols }

  return { outcome, ports }
}
