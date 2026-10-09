import { ServiceType as T } from '../../../../deployment/domain/value-objects/service-type.js'
import type { ContainerContext } from '../classification.js'
import {
  fingerprintPort,
  HTTP_CHECKS,
  httpFingerprintDiscriminatorWith,
  type HttpSnapshot,
} from '../discriminator-http.js'

const snap = (
  headers: Record<string, string> = {},
  body = '',
  status = 200,
): HttpSnapshot => ({ status, headers: new Headers(headers), body })

const check = (name: string, path = '/') => {
  const found = HTTP_CHECKS.find((c) => c.name === name && c.path === path)
  if (!found) throw new Error(`huella ${name} ${path} no existe`)
  return found
}

const OPENAPI = JSON.stringify({ openapi: '3.0.2', info: {} })

describe('huellas HTTP', () => {
  const cases: Array<[string, string, HttpSnapshot, HttpSnapshot]> = [
    [
      'Elasticsearch/OpenSearch',
      '/',
      snap({}, '{"cluster_name":"c","version":{"number":"8"}}'),
      snap({}, '{"version":"1"}'),
    ],
    ['CouchDB', '/', snap({}, '{"couchdb":"Welcome"}'), snap({}, '{"ok":true}')],
    ['Neo4j', '/', snap({}, '{"neo4j_version":"5"}'), snap({}, '{}')],
    ['InfluxDB', '/ping', snap({ 'x-influxdb-version': '2.7' }), snap()],
    ['Envoy', '/', snap({ server: 'envoy' }), snap({ server: 'nginx' })],
    ['Envoy', '/', snap({ 'x-envoy-upstream-service-time': '3' }), snap()],
    ['Servidor web', '/', snap({ server: 'nginx/1.27' }), snap({ server: 'gunicorn' })],
    ['Servidor web', '/', snap({ server: 'Apache/2.4' }), snap({ server: 'x-nginx' })],
    ['Next.js', '/', snap({ 'x-powered-by': 'Next.js' }), snap({ 'x-powered-by': 'Express' })],
    ['Servidor de aplicación', '/', snap({ server: 'gunicorn' }), snap({ server: 'nginx' })],
    ['Servidor de aplicación', '/', snap({ 'x-powered-by': 'Express' }), snap()],
    [
      'SPA',
      '/',
      snap({ 'content-type': 'text/html' }, '<div id="root"></div>'),
      snap({ 'content-type': 'text/html' }, '<h1>hola</h1>'),
    ],
    [
      'SPA',
      '/',
      snap({ 'content-type': 'text/html' }, '<script type="module" src="/a.js">'),
      snap({ 'content-type': 'application/json' }, '<div id="root">'),
    ],
    ['OpenAPI', '/openapi.json', snap({}, OPENAPI), snap({}, OPENAPI, 404)],
    ['OpenAPI', '/api/schema/', snap({}, "openapi: '3.0.3'\ninfo: {}"), snap({}, 'nada')],
    ['OpenAPI', '/swagger.json', snap({}, '{"swagger": "2.0"}'), snap({}, '{"swagger": "1.2"}')],
    ['OpenAPI', '/v3/api-docs', snap({}, OPENAPI), snap()],
    [
      'JSON en /',
      '/',
      snap({ 'content-type': 'application/json; charset=utf-8' }, '{}'),
      snap({ 'content-type': 'text/plain' }),
    ],
  ]

  it.each(cases)('%s (%s): positivo y negativo', (name, path, positive, negative) => {
    expect(check(name, path).match(positive)).toBe(true)
    expect(check(name, path).match(negative)).toBe(false)
  })

  it('un snapshot con server: nginx y /openapi.json válido da "Servidor web", no OpenAPI', async () => {
    const fetcher = async (_h: string, _p: number, path: string) =>
      path === '/openapi.json' ? snap({}, OPENAPI) : snap({ server: 'nginx/1.27' })

    const found = await fingerprintPort('h', 80, fetcher)

    expect(found?.name).toBe('Servidor web')
    expect(found?.types).toEqual([T.REVERSE_PROXY, T.FRONTEND])
  })

  it('un Django que renderiza HTML sigue siendo BACKEND (aplicación antes que SPA)', async () => {
    const fetcher = async () =>
      snap({ server: 'gunicorn', 'content-type': 'text/html' }, '<div id="root"></div>')

    expect((await fingerprintPort('h', 80, fetcher))?.name).toBe('Servidor de aplicación')
  })

  it('pide cada ruta una sola vez por puerto', async () => {
    const requested: string[] = []
    const fetcher = async (_h: string, _p: number, path: string) => {
      requested.push(path)
      return null
    }

    await fingerprintPort('h', 80, fetcher)

    expect(requested.sort()).toEqual(
      ['/', '/api/schema/', '/openapi.json', '/ping', '/swagger.json', '/v3/api-docs'].sort(),
    )
  })

  it('un fetch que falla (null) no coincide con nada', async () => {
    expect(await fingerprintPort('h', 80, async () => null)).toBeNull()
  })
})

describe('httpFingerprintDiscriminator', () => {
  const ctx: ContainerContext = {
    id: 'c',
    image: 'x',
    host: 'h',
    aliases: [],
    ports: [80, 81],
    command: [],
    env: {},
  }
  const discriminator = httpFingerprintDiscriminatorWith(async (_h, port) =>
    port === 80 ? snap({ server: 'nginx' }) : snap({ server: 'gunicorn' }),
  )

  it('devuelve null si ningún puerto es http', async () => {
    const facts = {
      ports: [
        { port: 80, status: 'identified', protocol: 'resp' },
        { port: 81, status: 'closed' },
      ],
    } as const

    expect(await discriminator.discriminate(ctx, [], facts)).toBeNull()
  })

  it('une los tipos de todos los puertos y lista puerto → huella', async () => {
    const facts = {
      ports: [
        { port: 80, status: 'identified', protocol: 'http' },
        { port: 81, status: 'identified', protocol: 'http' },
        { port: 82, status: 'unidentified' },
      ],
    } as const

    const finding = await discriminator.discriminate(ctx, [], facts)

    expect(finding?.types).toEqual([T.REVERSE_PROXY, T.FRONTEND, T.BACKEND])
    expect(finding?.evidence).toBe('80 → Servidor web, 81 → Servidor de aplicación')
  })

  it('devuelve null si ningún puerto coincide', async () => {
    const none = httpFingerprintDiscriminatorWith(async () => snap())
    const facts = { ports: [{ port: 80, status: 'identified', protocol: 'http' }] } as const

    expect(await none.discriminate(ctx, [], facts)).toBeNull()
  })
})
