import { ServiceType } from '../../../deployment/domain/value-objects/service-type.js'
import type { Discriminator } from './discrimination.js'

const REQUEST_TIMEOUT_MS = 2000
const MAX_BODY_BYTES = 64 * 1024

export interface HttpSnapshot {
  readonly status: number
  readonly headers: Headers
  readonly body: string
}

export interface HttpCheck {
  readonly name: string
  readonly path: string
  readonly types: readonly ServiceType[]
  match(s: HttpSnapshot): boolean
}

// ── Helpers puros ─────────────────────────────────────────────
const header = (s: HttpSnapshot, name: string): string => (s.headers.get(name) ?? '').toLowerCase()

function jsonObject(body: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(body)
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

const hasKeys =
  (...keys: string[]) =>
  (s: HttpSnapshot): boolean => {
    const json = jsonObject(s.body)
    return json !== null && keys.every((key) => key in json)
  }

const headerStartsWith = (name: string, prefixes: readonly string[]) => (s: HttpSnapshot) =>
  prefixes.some((prefix) => header(s, name).startsWith(prefix))

const headerIncludes = (name: string, needles: readonly string[]) => (s: HttpSnapshot) =>
  needles.some((needle) => header(s, name).includes(needle))

// JSON y YAML (drf-spectacular sirve YAML por defecto).
const OPENAPI_BODY = /"openapi"\s*:\s*"3|^openapi:\s*['"]?3|"swagger"\s*:\s*"2/m
const declaresOpenApi = (s: HttpSnapshot): boolean => s.status === 200 && OPENAPI_BODY.test(s.body)

const SPA_BODY = /id=["']root["']|id=["']app["']|\/@vite\/client|<script[^>]*type=["']module["']/

const openApiCheck = (path: string): HttpCheck => ({
  name: 'OpenAPI',
  path,
  types: [ServiceType.BACKEND],
  match: declaresOpenApi,
})

/**
 * El orden importa: la primera que coincida gana.
 * - "Servidor web" va antes que OpenAPI: un nginx que hace proxy a un backend devuelve el
 *   /openapi.json del backend, y eso no lo convierte en backend.
 * - "Servidor de aplicación" va antes que "SPA": un Django que renderiza HTML sigue siendo BACKEND.
 */
export const HTTP_CHECKS: readonly HttpCheck[] = [
  {
    name: 'Elasticsearch/OpenSearch',
    path: '/',
    types: [ServiceType.DATABASE],
    match: hasKeys('cluster_name', 'version'),
  },
  { name: 'CouchDB', path: '/', types: [ServiceType.DATABASE], match: hasKeys('couchdb') },
  { name: 'Neo4j', path: '/', types: [ServiceType.DATABASE], match: hasKeys('neo4j_version') },
  {
    name: 'InfluxDB',
    path: '/ping',
    types: [ServiceType.DATABASE],
    match: (s) => s.headers.has('x-influxdb-version'),
  },
  {
    name: 'Envoy',
    path: '/',
    types: [ServiceType.REVERSE_PROXY],
    match: (s) =>
      headerStartsWith('server', ['envoy'])(s) || s.headers.has('x-envoy-upstream-service-time'),
  },
  {
    name: 'Servidor web',
    path: '/',
    types: [ServiceType.REVERSE_PROXY, ServiceType.FRONTEND],
    match: headerStartsWith('server', ['nginx', 'openresty', 'caddy', 'apache', 'lighttpd']),
  },
  {
    name: 'Next.js',
    path: '/',
    types: [ServiceType.FRONTEND],
    match: headerIncludes('x-powered-by', ['next.js']),
  },
  {
    name: 'Servidor de aplicación',
    path: '/',
    types: [ServiceType.BACKEND],
    match: (s) =>
      headerIncludes('server', [
        'gunicorn',
        'uvicorn',
        'hypercorn',
        'daphne',
        'wsgiserver',
        'werkzeug',
        'waitress',
        'kestrel',
        'jetty',
        'tomcat',
        'puma',
      ])(s) || headerIncludes('x-powered-by', ['express', 'php', 'asp.net'])(s),
  },
  {
    name: 'SPA',
    path: '/',
    types: [ServiceType.FRONTEND],
    match: (s) => header(s, 'content-type').includes('html') && SPA_BODY.test(s.body),
  },
  openApiCheck('/openapi.json'),
  openApiCheck('/api/schema/'),
  openApiCheck('/swagger.json'),
  openApiCheck('/v3/api-docs'),
  {
    name: 'JSON en /',
    path: '/',
    types: [ServiceType.BACKEND],
    match: headerIncludes('content-type', ['application/json']),
  },
]

// ── I/O: lo único que toca la red ─────────────────────────────
export type SnapshotFetcher = (host: string, port: number, path: string) => Promise<HttpSnapshot | null>

/** Lee como máximo `MAX_BODY_BYTES` y cancela el resto del stream. */
async function readBody(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''

  const chunks: Uint8Array[] = []
  let received = 0
  try {
    while (received < MAX_BODY_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.byteLength
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }

  return Buffer.concat(chunks).subarray(0, MAX_BODY_BYTES).toString('utf8')
}

export const fetchSnapshot: SnapshotFetcher = async (host, port, path) => {
  try {
    const response = await fetch(`http://${host}:${port}${path}`, {
      // Un 302 a /login ya trae los headers útiles y no hay que salir del contenedor.
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { 'user-agent': 'hub-classifier' },
    })
    return { status: response.status, headers: response.headers, body: await readBody(response) }
  } catch {
    return null
  }
}

/** Primera huella que coincide en un puerto. Cada ruta se pide una sola vez. */
export async function fingerprintPort(
  host: string,
  port: number,
  fetcher: SnapshotFetcher = fetchSnapshot,
  checks: readonly HttpCheck[] = HTTP_CHECKS,
): Promise<HttpCheck | null> {
  const snapshots = new Map<string, Promise<HttpSnapshot | null>>()
  const snapshotOf = (path: string) => {
    let pending = snapshots.get(path)
    if (!pending) {
      pending = fetcher(host, port, path)
      snapshots.set(path, pending)
    }
    return pending
  }

  for (const check of checks) {
    const snapshot = await snapshotOf(check.path)
    if (snapshot && check.match(snapshot)) return check
  }
  return null
}

export function httpFingerprintDiscriminatorWith(fetcher: SnapshotFetcher): Discriminator {
  return {
    name: 'huella HTTP',
    resolves: [
      ServiceType.BACKEND,
      ServiceType.FRONTEND,
      ServiceType.REVERSE_PROXY,
      ServiceType.DATABASE,
    ],
    async discriminate(ctx, _candidates, facts) {
      try {
        const httpPorts = (facts.ports ?? []).flatMap((result) =>
          result.status === 'identified' && result.protocol === 'http' ? [result.port] : [],
        )
        if (httpPorts.length === 0) return null

        const found = await Promise.all(
          httpPorts.map(async (port) => ({
            port,
            check: await fingerprintPort(ctx.host, port, fetcher),
          })),
        )

        const matched = found.flatMap(({ port, check }) => (check ? [{ port, check }] : []))
        if (matched.length === 0) return null

        return {
          types: [...new Set(matched.flatMap(({ check }) => check.types))],
          evidence: matched.map(({ port, check }) => `${port} → ${check.name}`).join(', '),
        }
      } catch {
        return null
      }
    },
  }
}

export const httpFingerprintDiscriminator: Discriminator =
  httpFingerprintDiscriminatorWith(fetchSnapshot)
