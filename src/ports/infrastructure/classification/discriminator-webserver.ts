import { ServiceType } from '../../../deployment/domain/value-objects/service-type.js'
import type { ContainerContext } from './classification.js'
import type { Discriminator, Finding } from './discrimination.js'

export interface ContainerFiles {
  /** Contenido del archivo, o null si no existe. */
  read(ctx: ContainerContext, path: string): Promise<string | null>
  /** Nombres de archivo en un directorio, o [] si no existe. */
  list(ctx: ContainerContext, dir: string): Promise<string[]>
}

const CONFIG_FILES = [
  '/etc/nginx/nginx.conf',
  '/etc/caddy/Caddyfile',
  '/usr/local/apache2/conf/httpd.conf',
] as const

const CONFIG_DIRS = [
  '/etc/nginx/conf.d',
  '/etc/nginx/sites-enabled',
  '/usr/local/apache2/conf/extra',
] as const

// La directiva va al inicio de línea o tras `{` / `;` (p. ej. `location /api { proxy_pass …; }`).
const directive = (names: string): RegExp => new RegExp(`(?:^|[;{])\\s*(${names})\\b`, 'm')

const PROXY_DIRECTIVE = directive(
  'proxy_pass|grpc_pass|uwsgi_pass|fastcgi_pass|reverse_proxy|ProxyPass',
)
const STATIC_DIRECTIVE = directive('root|try_files|file_server|DocumentRoot')

/** `#` hasta fin de línea. La imagen oficial de nginx trae un `proxy_pass` comentado en default.conf. */
export function stripComments(config: string): string {
  return config.replace(/#.*$/gm, '')
}

export interface ConfigFile {
  readonly path: string
  readonly content: string
}

/** Función pura: configuraciones ya leídas → hallazgo, o null si no hay señales. */
export function findingFromConfigs(files: readonly ConfigFile[]): Finding | null {
  let proxy: string | null = null
  let statics: string | null = null

  for (const { path, content } of files) {
    const clean = stripComments(content)
    proxy ??= PROXY_DIRECTIVE.exec(clean)?.[1]?.concat(` en ${path}`) ?? null
    statics ??= STATIC_DIRECTIVE.exec(clean)?.[1]?.concat(` en ${path}`) ?? null
  }

  const types: ServiceType[] = []
  const evidence: string[] = []
  if (proxy) {
    types.push(ServiceType.REVERSE_PROXY)
    evidence.push(`proxy (${proxy})`)
  }
  if (statics) {
    types.push(ServiceType.FRONTEND)
    evidence.push(`estáticos (${statics})`)
  }
  if (types.length === 0) return null

  return { types, evidence: evidence.join(', ') }
}

async function readConfigs(files: ContainerFiles, ctx: ContainerContext): Promise<ConfigFile[]> {
  const listed = await Promise.all(
    CONFIG_DIRS.map(async (dir) => (await files.list(ctx, dir)).map((name) => `${dir}/${name}`)),
  )
  const paths = [...new Set([...CONFIG_FILES, ...listed.flat()])]

  const contents = await Promise.all(
    paths.map(async (path) => ({ path, content: await files.read(ctx, path) })),
  )
  return contents.flatMap(({ path, content }) => (content === null ? [] : [{ path, content }]))
}

export function webServerConfigDiscriminator(files: ContainerFiles): Discriminator {
  return {
    name: 'config del servidor web',
    resolves: [ServiceType.REVERSE_PROXY, ServiceType.FRONTEND],
    async discriminate(ctx) {
      try {
        return findingFromConfigs(await readConfigs(files, ctx))
      } catch {
        return null
      }
    },
  }
}
