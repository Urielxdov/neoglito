/**
 * Las sondas NO hacen I/O. Solo saben qué bytes mandar y cómo reconocer la respuesta.
 * Los sockets los maneja port-identification.ts, así cada sonda se prueba con un Buffer.
 */
export type Protocol =
  | 'mysql'
  | 'nats'
  | 'postgres'
  | 'resp'
  | 'memcached'
  | 'amqp'
  | 'kafka'
  | 'mqtt'
  | 'mongo'
  | 'http'

/** El servidor se presenta al conectar (banner). No hay que mandarle nada. */
export interface ServerFirstProbe {
  readonly speaksFirst: 'server'
  matchBanner(banner: Buffer): boolean
}

/** El servidor espera a que el cliente hable. Se le manda `request` y se evalúa la respuesta. */
export interface ClientFirstProbe {
  readonly speaksFirst: 'client'
  request(host: string): Buffer
  matchResponse(response: Buffer): boolean
}

export type ProtocolProbe = ServerFirstProbe | ClientFirstProbe

// ── Helpers ───────────────────────────────────────────────────
const ascii = (s: string) => Buffer.from(s, 'latin1')
const int32le = (n: number) => {
  const b = Buffer.alloc(4)
  b.writeInt32LE(n)
  return b
}

const KAFKA_CORRELATION_ID = 0x2a
const MONGO_REQUEST_ID = 0x2a
const MONGO_OP_MSG = 2013

/** OP_MSG con { hello: 1, $db: "admin" }: no requiere autenticación. */
function mongoHello(): Buffer {
  const elements = Buffer.concat([
    Buffer.from([0x10]), ascii('hello\0'), int32le(1), // int32 hello = 1
    Buffer.from([0x02]), ascii('$db\0'), int32le(6), ascii('admin\0'), // string $db = "admin"
    Buffer.from([0x00]),
  ])
  const bson = Buffer.concat([int32le(elements.length + 4), elements])
  const body = Buffer.concat([int32le(0), Buffer.from([0x00]), bson]) // flagBits + sección kind 0
  const header = Buffer.concat([
    int32le(16 + body.length),
    int32le(MONGO_REQUEST_ID),
    int32le(0),
    int32le(MONGO_OP_MSG),
  ])
  return Buffer.concat([header, body])
}

// ── Registro ──────────────────────────────────────────────────
// Record<Protocol, …>: si falta la sonda de un protocolo declarado, no compila.
export const PROBES: Record<Protocol, ProtocolProbe> = {
  mysql: {
    speaksFirst: 'server',
    // Paquete: 3 bytes de largo + seq 0 + 0x0a (handshake v10) o 0xff (error, p. ej. host no permitido).
    matchBanner: (b) => b.length > 4 && b[3] === 0x00 && (b[4] === 0x0a || b[4] === 0xff),
  },

  nats: {
    speaksFirst: 'server',
    matchBanner: (b) => b.toString('latin1').startsWith('INFO {'),
  },

  postgres: {
    speaksFirst: 'client',
    // SSLRequest: largo 8 + código 80877103. Responde un solo byte: 'S' o 'N'.
    request: () => Buffer.from([0x00, 0x00, 0x00, 0x08, 0x04, 0xd2, 0x16, 0x2f]),
    matchResponse: (r) => r.length === 1 && (r[0] === 0x53 || r[0] === 0x4e),
  },

  resp: {
    speaksFirst: 'client',
    request: () => ascii('PING\r\n'),
    // +PONG, o un error RESP (-NOAUTH, -DENIED…): ambos confirman el protocolo.
    matchResponse: (r) => /^(\+PONG|-[A-Z]+ )/.test(r.toString('latin1')),
  },

  memcached: {
    speaksFirst: 'client',
    request: () => ascii('version\r\n'),
    matchResponse: (r) => r.toString('latin1').startsWith('VERSION '),
  },

  amqp: {
    speaksFirst: 'client',
    request: () => ascii('AMQP\x00\x00\x09\x01'),
    // Frame de método (tipo 1) en el canal 0 = Connection.Start. Si la versión no coincide, el broker devuelve su header "AMQP…".
    matchResponse: (r) =>
      (r.length >= 7 && r[0] === 0x01 && r.readUInt16BE(1) === 0) ||
      r.subarray(0, 4).toString('latin1') === 'AMQP',
  },

  kafka: {
    speaksFirst: 'client',
    // ApiVersions v0: largo, api_key 18, versión 0, correlation_id, client_id nulo.
    request: () =>
      Buffer.from([0x00, 0x00, 0x00, 0x0a, 0x00, 0x12, 0x00, 0x00, 0x00, 0x00, 0x00, KAFKA_CORRELATION_ID, 0xff, 0xff]),
    matchResponse: (r) => r.length >= 8 && r.readInt32BE(4) === KAFKA_CORRELATION_ID,
  },

  mqtt: {
    speaksFirst: 'client',
    // CONNECT 3.1.1, clean session, client id vacío.
    request: () => Buffer.from([0x10, 0x0c, 0x00, 0x04, 0x4d, 0x51, 0x54, 0x54, 0x04, 0x02, 0x00, 0x3c, 0x00, 0x00]),
    matchResponse: (r) => r.length >= 4 && r[0] === 0x20 && r[1] === 0x02, // CONNACK
  },

  mongo: {
    speaksFirst: 'client',
    request: mongoHello,
    matchResponse: (r) =>
      r.length >= 16 && r.readInt32LE(8) === MONGO_REQUEST_ID && r.readInt32LE(12) === MONGO_OP_MSG,
  },

  http: {
    speaksFirst: 'client',
    // HEAD: no ejecuta lógica que dependa del cuerpo y la respuesta es corta.
    request: (host) =>
      ascii(`HEAD / HTTP/1.1\r\nHost: ${host}\r\nUser-Agent: hub-classifier\r\nConnection: close\r\n\r\n`),
    matchResponse: (r) => /^HTTP\/\d(\.\d)? \d{3}/.test(r.toString('latin1')),
  },
}
