import {
  createServer as createHttpServer,
  type RequestListener,
  type Server as HttpServer,
} from 'node:http';
import {
  createServer as createTcpServer,
  type Server as TcpServer,
} from 'node:net';
import type { AddressInfo } from 'node:net';
import type { ContainerRuntimePort } from '../../../../container/application/container-runtime.port.js';
import { ServiceType as T } from '../../../../deployment/domain/value-objects/service-type.js';
import type { ContainerContext } from '../classification.js';
import { ContainerClassificationService } from '../container-classification.service.js';
import { TcpContainerProbeService } from '../../probing/tcp-container-probe.service.js';

const servers: Array<HttpServer | TcpServer> = [];

async function listen<S extends HttpServer | TcpServer>(
  server: S,
): Promise<{ server: S; port: number }> {
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: (server.address() as AddressInfo).port };
}

const httpServer = (listener: RequestListener) =>
  listen(createHttpServer(listener));
const respServer = () =>
  listen(
    createTcpServer((socket) =>
      socket.on('data', () => socket.write('+PONG\r\n')),
    ),
  );

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          if ('closeAllConnections' in server) server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
});

const container = (overrides: Partial<ContainerContext>): ContainerContext => ({
  id: 'c',
  image: 'miorg/app:1',
  host: '127.0.0.1',
  aliases: [],
  ports: [],
  command: [],
  env: {},
  ...overrides,
});

async function run(
  ctx: ContainerContext,
  all = [ctx],
  contents: Record<string, string> = {},
) {
  const runtime = {
    readFile: async (_id: string, path: string) => contents[path] ?? null,
    listFiles: async (_id: string, dir: string) =>
      Object.keys(contents)
        .filter((path) => path.startsWith(`${dir}/`))
        .map((path) => path.slice(dir.length + 1)),
  } as unknown as ContainerRuntimePort;
  const service = new ContainerClassificationService(
    new TcpContainerProbeService(),
    runtime,
  );
  const results = await service.classify(
    all.map((container) => ({
      containerId: container.id,
      image: container.image,
      aliases: container.aliases,
      ports: container.ports,
      command: container.command,
      env: container.env,
    })),
  );
  return results.find((result) => result.containerId === ctx.id)!
    .classification;
}

describe('clasificador con desempates (integración)', () => {
  it('una imagen conocida resuelve sin tener puertos publicados', async () => {
    expect(await run(container({ image: 'postgres:16' }))).toMatchObject({
      kind: 'resolved',
      type: T.DATABASE,
    });
  });

  it('las herramientas conocidas se resuelven explícitamente como UNKNOWN', async () => {
    expect(
      await run(container({ image: 'dpage/pgadmin4:latest' })),
    ).toMatchObject({ kind: 'resolved', type: T.UNKNOWN });
  });

  it('una aplicación sin puertos publicados ni comando reconocido queda unknown', async () => {
    expect(
      await run(container({ command: ['node', 'server.js'] })),
    ).toMatchObject({ kind: 'unknown' });
  });

  it('redis sin puerto publicado también puede identificarse por sus consumidores', async () => {
    const redis = container({
      id: 'redis',
      image: 'redis:7',
      aliases: ['redis'],
    });
    const worker = container({
      id: 'worker',
      env: { CELERY_BROKER_URL: 'redis://redis:6379/0' },
    });
    expect(await run(redis, [redis, worker])).toMatchObject({
      kind: 'resolved',
      type: T.MESSAGE_BROKER,
    });
  });

  it('sin puertos y celery worker resuelve WORKER', async () => {
    expect(
      await run(container({ command: ['celery', '-A', 'billing', 'worker'] })),
    ).toMatchObject({ kind: 'resolved', type: T.WORKER });
  });

  it('HTTP sin huellas reconocidas conserva la ambigüedad', async () => {
    const { port } = await httpServer((_req, res) => {
      res.setHeader('content-type', 'text/plain');
      res.end('ok');
    });
    expect(await run(container({ ports: [port] }))).toMatchObject({
      kind: 'ambiguous',
      candidates: [T.BACKEND, T.FRONTEND, T.DATABASE, T.REVERSE_PROXY],
    });
  });

  it('HTTP con server: gunicorn → BACKEND', async () => {
    const { port } = await httpServer((_req, res) => {
      res.setHeader('server', 'gunicorn');
      res.end('hola');
    });

    expect(await run(container({ ports: [port] }))).toMatchObject({
      kind: 'resolved',
      type: T.BACKEND,
    });
  });

  it('HTML con id="root" y /@vite/client → FRONTEND', async () => {
    const { port } = await httpServer((_req, res) => {
      res.setHeader('content-type', 'text/html');
      res.end(
        '<div id="root"></div><script type="module" src="/@vite/client"></script>',
      );
    });

    expect(await run(container({ ports: [port] }))).toMatchObject({
      kind: 'resolved',
      type: T.FRONTEND,
    });
  });

  it('JSON con cluster_name y version → DATABASE', async () => {
    const { port } = await httpServer((_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(
        '{"cluster_name":"docker-cluster","version":{"number":"8.13.0"}}',
      );
    });

    expect(await run(container({ ports: [port] }))).toMatchObject({
      kind: 'resolved',
      type: T.DATABASE,
    });
  });

  it('nginx con proxy_pass que expone /openapi.json → REVERSE_PROXY', async () => {
    const { port } = await httpServer((req, res) => {
      res.setHeader('server', 'nginx/1.27');
      res.end(req.url === '/openapi.json' ? '{"openapi":"3.1.0"}' : 'ok');
    });
    const nginx = container({ image: 'nginx:alpine', ports: [port] });

    const result = await run(nginx, [nginx], {
      '/etc/nginx/conf.d/default.conf':
        'server { location / { proxy_pass http://api:8000; } }',
    });

    expect(result).toMatchObject({ kind: 'resolved', type: T.REVERSE_PROXY });
  });

  it('redis con otro contenedor que lo usa como broker → MESSAGE_BROKER', async () => {
    const { port } = await respServer();
    const redis = container({
      id: 'redis',
      image: 'redis:7',
      aliases: ['redis'],
      ports: [port],
    });
    const worker = container({
      id: 'worker',
      aliases: ['worker'],
      env: { CELERY_BROKER_URL: 'redis://redis:6379/0' },
    });

    expect(await run(redis, [redis, worker])).toMatchObject({
      kind: 'resolved',
      type: T.MESSAGE_BROKER,
    });
  });

  it('redis que nadie referencia queda ambiguo [CACHE, MESSAGE_BROKER]', async () => {
    const { port } = await respServer();
    const redis = container({
      id: 'redis',
      image: 'redis:7',
      aliases: ['redis'],
      ports: [port],
    });

    expect(await run(redis)).toMatchObject({
      kind: 'ambiguous',
      candidates: [T.CACHE, T.MESSAGE_BROKER],
    });
  });

  it('sin puertos y celery beat → SCHEDULER', async () => {
    const ctx = container({ command: ['celery', '-A', 'billing', 'beat'] });

    expect(await run(ctx)).toMatchObject({
      kind: 'resolved',
      type: T.SCHEDULER,
    });
  });

  it("sin puertos y sh -c 'celery … worker -B' → ambiguo [WORKER, SCHEDULER]", async () => {
    const ctx = container({
      command: ['sh', '-c', 'celery -A billing worker -B'],
    });

    expect(await run(ctx)).toMatchObject({
      kind: 'ambiguous',
      candidates: [T.WORKER, T.SCHEDULER],
    });
  });
});
