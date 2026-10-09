import { ServiceType as T } from '../../../../deployment/domain/value-objects/service-type.js'
import type { ContainerContext } from '../classification.js'
import { webServerConfigDiscriminator, type ContainerFiles } from '../discriminator-webserver.js'

const ctx: ContainerContext = {
  id: 'web',
  image: 'nginx',
  host: 'h',
  aliases: ['web'],
  ports: [80],
  command: [],
  env: {},
}

/** Sistema de archivos en memoria: ruta completa → contenido. */
function memoryFiles(files: Record<string, string>): ContainerFiles {
  return {
    async read(_ctx, path) {
      return files[path] ?? null
    },
    async list(_ctx, dir) {
      return Object.keys(files)
        .filter((path) => path.startsWith(`${dir}/`))
        .map((path) => path.slice(dir.length + 1))
    },
  }
}

const run = (files: Record<string, string>) =>
  webServerConfigDiscriminator(memoryFiles(files)).discriminate(ctx, [], {})

describe('webServerConfigDiscriminator', () => {
  it('solo proxy_pass → REVERSE_PROXY', async () => {
    const finding = await run({
      '/etc/nginx/conf.d/default.conf': 'server {\n  location / {\n    proxy_pass http://api:8000;\n  }\n}',
    })

    expect(finding?.types).toEqual([T.REVERSE_PROXY])
    expect(finding?.evidence).toContain('proxy_pass en /etc/nginx/conf.d/default.conf')
  })

  it('solo root + try_files → FRONTEND', async () => {
    const finding = await run({
      '/etc/nginx/nginx.conf':
        'server {\n  root /usr/share/nginx/html;\n  location / { try_files $uri /index.html; }\n}',
    })

    expect(finding?.types).toEqual([T.FRONTEND])
  })

  it('ambos → ambiguo, con evidencia de las dos señales', async () => {
    const finding = await run({
      '/etc/nginx/conf.d/app.conf':
        'server {\n  root /srv;\n  location /api/ {\n    proxy_pass http://api;\n  }\n}',
    })

    expect(finding?.types).toEqual([T.REVERSE_PROXY, T.FRONTEND])
    expect(finding?.evidence).toMatch(/proxy.*estáticos/)
  })

  it('un proxy_pass comentado + root activo → FRONTEND', async () => {
    const finding = await run({
      '/etc/nginx/conf.d/default.conf':
        'server {\n  location / {\n    root /usr/share/nginx/html;\n  }\n  #location ~ \\.php$ {\n  #    proxy_pass http://127.0.0.1;\n  #}\n}',
    })

    expect(finding?.types).toEqual([T.FRONTEND])
  })

  it('reconoce Caddy y Apache', async () => {
    expect(
      (await run({ '/etc/caddy/Caddyfile': ':80 {\n  reverse_proxy api:8000\n}' }))?.types,
    ).toEqual([T.REVERSE_PROXY])
    expect(
      (await run({ '/usr/local/apache2/conf/httpd.conf': 'DocumentRoot "/usr/local/apache2/htdocs"' }))
        ?.types,
    ).toEqual([T.FRONTEND])
  })

  it('reconoce directivas en una sola línea', async () => {
    const finding = await run({ '/etc/nginx/nginx.conf': 'location /api { proxy_pass http://api; }' })

    expect(finding?.types).toEqual([T.REVERSE_PROXY])
  })

  it('sin archivos legibles o sin directivas → null', async () => {
    expect(await run({})).toBeNull()
    expect(await run({ '/etc/nginx/nginx.conf': 'worker_processes 1;' })).toBeNull()
  })

  it('un fallo de lectura termina en null', async () => {
    const broken: ContainerFiles = {
      read: () => Promise.reject(new Error('docker caído')),
      list: () => Promise.reject(new Error('docker caído')),
    }

    expect(await webServerConfigDiscriminator(broken).discriminate(ctx, [], {})).toBeNull()
  })
})
