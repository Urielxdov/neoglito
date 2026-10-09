import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { parse, stringify } from 'yaml';
import type { ComposePort } from '@neoglito/shared/repository';
import { YamlDeploymentComposeService } from './yaml-deployment-compose.service.js';
import type { ContainerRuntimePort } from '../../../container/application/container-runtime.port.js';

let directory: string;
let sourcePath: string;
const runtime = { resolveHostPath: vi.fn(async (path: string) => path) };
const configure = new YamlDeploymentComposeService(
  runtime as unknown as ContainerRuntimePort,
);
const mapping = (
  publishedPort: string | null,
  overrides: Partial<ComposePort> = {},
): ComposePort => ({
  service: 'api',
  hostIp: null,
  targetPort: '3000',
  publishedPort,
  protocol: 'tcp',
  mappingType: 'one-to-one',
  ...overrides,
});
const source = {
  name: 'existing-neoglito',
  services: {
    api: {
      container_name: 'existing-api',
      build: { context: '.', dockerfile: 'Dockerfile' },
      ports: ['3000:3000'],
      environment: [
        'MODE=original',
        'TOKEN=${API_TOKEN:?required}',
        'KEEP=a=b',
        'FROM_HOST',
      ],
      volumes: ['./src:/app/src'],
    },
    db: {
      image: 'postgres:16',
      ports: [
        {
          host_ip: '127.0.0.1',
          target: 5432,
          published: '5432',
          protocol: 'tcp',
          app_protocol: 'postgres',
          mode: 'host',
        },
      ],
      environment: { MODE: 'db-original', POSTGRES_PASSWORD: '${DB_PASSWORD}' },
    },
    worker: { image: 'custom/worker' },
  },
  volumes: {
    data: { name: 'existing-data' },
    shared: { external: true, name: 'shared-data' },
  },
  networks: {
    default: { name: 'existing-network' },
    shared: { external: true, name: 'shared-network' },
  },
};

beforeEach(async () => {
  runtime.resolveHostPath.mockImplementation(async (path: string) => path);
  directory = await mkdtemp(join(tmpdir(), 'neoglito-compose-test-'));
  await mkdir(join(directory, 'repo'));
  sourcePath = join(directory, 'repo', 'docker-compose.yml');
  vi.stubEnv('DEPLOYMENT_COMPOSE_DIRECTORY', join(directory, 'configurations'));
  await writeFile(sourcePath, stringify(source));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  if (directory.startsWith(join(tmpdir(), 'neoglito-compose-test-'))) {
    await rm(directory, { recursive: true, force: true });
  }
});

it('identifies legacy deployments pointing to the original Compose', async () => {
  expect(await configure.readSource(sourcePath, 'legacy')).toEqual({
    sourceComposePath: sourcePath,
    projectDirectory: dirname(sourcePath),
  });
});

it('returns only the directory for old generated files without a source path', async () => {
  const configuredPath = join(directory, '.neoglito-legacy.compose.yml');
  await writeFile(
    configuredPath,
    stringify({
      'x-neoglito': { projectDirectory: dirname(sourcePath) },
    }),
  );
  expect(await configure.readSource(configuredPath, 'legacy')).toEqual({
    sourceComposePath: null,
    projectDirectory: dirname(sourcePath),
  });
});

it('writes scoped values outside the repository and preserves the base for relative paths', async () => {
  const original = await readFile(sourcePath, 'utf8');
  const prepared = await configure.prepare(sourcePath, 'first', {
    environment: [
      { service: 'api', key: 'MODE', value: 'api-selected' },
      { service: 'db', key: 'MODE', value: 'db-selected' },
      { service: 'api', key: 'TOKEN', value: 'a=b$literal${NOT_INTERPOLATED}' },
      { key: 'ADDED', value: 'all-services' },
    ],
    ports: [
      mapping('13000'),
      mapping('15432', {
        service: 'db',
        hostIp: '127.0.0.1',
        targetPort: '5432',
      }),
    ],
  });
  const output = parse(
    await readFile(prepared.composePath, 'utf8'),
  ) as typeof source;
  expect(dirname(prepared.composePath)).toBe(join(directory, 'configurations'));
  expect(output).toHaveProperty(
    'x-neoglito.projectDirectory',
    join(directory, 'repo'),
  );
  expect(prepared.publishedPorts).toEqual([13000, 15432]);
  expect(await configure.readSource(prepared.composePath, 'first')).toEqual({
    sourceComposePath: sourcePath,
    projectDirectory: dirname(sourcePath),
  });
  expect(output.name).toBe('neoglito-first');
  expect(output.services.api.container_name).toBe('neoglito-first-api');
  expect(output.services.api.build).toEqual(source.services.api.build);
  expect(output.services.api.volumes).toEqual([
    {
      type: 'bind',
      source: join(directory, 'repo', 'src'),
      target: '/app/src',
      read_only: false,
    },
  ]);
  expect(output.services.api.ports).toEqual(['13000:3000/tcp']);
  expect(output.services.api.environment).toEqual({
    MODE: 'api-selected',
    TOKEN: 'a=b$$literal$${NOT_INTERPOLATED}',
    KEEP: 'a=b',
    FROM_HOST: null,
    ADDED: 'all-services',
  });
  expect(output.services.db.environment).toMatchObject({
    MODE: 'db-selected',
    ADDED: 'all-services',
  });
  expect(output.services.worker).toMatchObject({
    environment: { ADDED: 'all-services' },
  });
  expect(output.services.db.ports[0]).toEqual({
    ...source.services.db.ports[0],
    published: '15432',
  });
  expect(output.volumes.data.name).toBe('neoglito-first-data');
  expect(output.networks.default.name).toBe('neoglito-first-default');
  expect(output.volumes.shared).toEqual(source.volumes.shared);
  expect(output.networks.shared).toEqual(source.networks.shared);
  expect(await readFile(sourcePath, 'utf8')).toBe(original);
});

it('keeps two configured deployments independent from later settings', async () => {
  const first = await configure.prepare(sourcePath, 'first', {
    ports: [mapping('13000')],
  });
  const before = await readFile(first.composePath, 'utf8');
  const second = await configure.prepare(sourcePath, 'second', {
    ports: [mapping('23000')],
  });
  expect(second.composePath).not.toBe(first.composePath);
  expect(second.projectName).not.toBe(first.projectName);
  expect(second.publishedPorts).toContain(23000);
  expect(await readFile(first.composePath, 'utf8')).toBe(before);
});

it('mirrors selected ports and configures listeners, healthchecks and service URLs together', async () => {
  await writeFile(
    sourcePath,
    stringify({
      services: {
        api: {
          build: '.',
          ports: ['3000:3000'],
          environment: {
            DATABASE_URL: 'postgresql://user:password@postgres:5432/db',
            REDIS_URL: 'redis://redis:6379',
            FRONTEND_URL: 'http://localhost:5174',
            BACKEND_URL: 'http://localhost:3000',
            GITHUB_CALLBACK_URL: 'http://localhost:3000/auth/github/callback',
          },
          command: 'sh -c "npm ci && npm run start:dev"',
        },
        postgres: {
          image: 'postgres:17-alpine',
          ports: ['5432:5432'],
          healthcheck: { test: ['CMD-SHELL', 'pg_isready -U postgres'] },
        },
        redis: {
          image: 'redis:8-alpine',
          ports: ['6379:6379'],
          healthcheck: { test: ['CMD', 'redis-cli', 'ping'] },
        },
        frontend: {
          image: 'node:22-alpine',
          ports: ['5174:5174'],
          environment: { VITE_API_URL: 'http://localhost:3000' },
          command:
            'sh -c "npm ci && npm --workspace @neoglito/web run dev -- --host 0.0.0.0"',
        },
      },
    }),
  );
  const prepared = await configure.prepare(sourcePath, 'mirror', {
    mirrorPorts: true,
    ports: [
      mapping('3002'),
      mapping('5433', { service: 'postgres', targetPort: '5432' }),
      mapping('6380', { service: 'redis', targetPort: '6379' }),
      mapping('5175', { service: 'frontend', targetPort: '5174' }),
    ],
  });
  const output = parse(await readFile(prepared.composePath, 'utf8')) as {
    services: Record<
      string,
      {
        ports: string[];
        command: unknown;
        environment: Record<string, string>;
        healthcheck: { test: string[] };
      }
    >;
  };
  expect(output.services.api.ports).toEqual(['3002:3002/tcp']);
  expect(output.services.postgres.ports).toEqual(['5433:5433/tcp']);
  expect(output.services.redis.ports).toEqual(['6380:6380/tcp']);
  expect(output.services.frontend.ports).toEqual(['5175:5175/tcp']);
  expect(output.services.api.environment).toMatchObject({
    PORT: '3002',
    DATABASE_URL: 'postgresql://user:password@postgres:5433/db',
    REDIS_URL: 'redis://redis:6380',
    FRONTEND_URL: 'http://localhost:5175',
    BACKEND_URL: 'http://localhost:3002',
    GITHUB_CALLBACK_URL: 'http://localhost:3002/auth/github/callback',
  });
  expect(output.services.frontend.environment.VITE_API_URL).toBe(
    'http://localhost:3002',
  );
  expect(output.services.frontend.command).toContain(
    '--host 0.0.0.0 --port 5175',
  );
  expect(output.services.postgres.command).toEqual(['postgres', '-p', '5433']);
  expect(output.services.postgres.environment.PGPORT).toBe('5433');
  expect(output.services.redis.command).toEqual([
    'redis-server',
    '--port',
    '6380',
  ]);
  expect(output.services.redis.healthcheck.test).toEqual([
    'CMD',
    'redis-cli',
    '-p',
    '6380',
    'ping',
  ]);
});

it('does not claim mirrored connectivity for an application with an unknown listener', async () => {
  await writeFile(
    sourcePath,
    stringify({
      services: { api: { image: 'custom/app', ports: ['3000:3000'] } },
    }),
  );
  await expect(
    configure.prepare(sourcePath, 'unsupported', {
      mirrorPorts: true,
      ports: [mapping('3002')],
    }),
  ).rejects.toThrow('No se conoce cómo cambiar el listener');
});

it('translates only bind sources and preserves anonymous and named volumes', async () => {
  runtime.resolveHostPath.mockImplementation(async () => '/host/real-checkout');
  await writeFile(
    sourcePath,
    stringify({
      services: {
        api: {
          image: 'app',
          volumes: [
            '.:/app:ro',
            '/app/node_modules',
            'database:/data',
            {
              type: 'bind',
              source: './config',
              target: '/etc/app',
              read_only: true,
            },
          ],
        },
      },
      volumes: { database: {} },
    }),
  );
  const prepared = await configure.prepare(sourcePath, 'mounts', {});
  const output = parse(await readFile(prepared.composePath, 'utf8')) as {
    services: { api: { volumes: unknown[] } };
  };
  expect(output.services.api.volumes).toEqual([
    {
      type: 'bind',
      source: '/host/real-checkout',
      target: '/app',
      read_only: true,
    },
    '/app/node_modules',
    'database:/data',
    {
      type: 'bind',
      source: '/host/real-checkout',
      target: '/etc/app',
      read_only: true,
    },
  ]);
});

it('changes only the selected service when Compose services share YAML anchors and merge keys', async () => {
  await writeFile(
    sourcePath,
    [
      'x-service: &service',
      '  image: app',
      '  environment: {MODE: original}',
      '  ports: ["3000:3000"]',
      'services:',
      '  api:',
      '    <<: *service',
      '  other:',
      '    <<: *service',
      '    ports: []',
    ].join('\n'),
  );
  const prepared = await configure.prepare(sourcePath, 'anchors', {
    environment: [{ service: 'api', key: 'MODE', value: 'selected' }],
    ports: [mapping('13000')],
  });
  const output = parse(await readFile(prepared.composePath, 'utf8')) as {
    services: Record<
      string,
      { environment: { MODE: string }; ports: string[] }
    >;
  };
  expect(output.services.api.environment.MODE).toBe('selected');
  expect(output.services.other.environment.MODE).toBe('original');
  expect(output.services.api.ports).toEqual(['13000:3000/tcp']);
  expect(output.services.other.ports).toEqual([]);
});

it('preserves an unassigned host port without trying to reserve port zero', async () => {
  const prepared = await configure.prepare(sourcePath, 'random', {
    ports: [mapping(null)],
  });
  expect(prepared.publishedPorts).toEqual([5432]);
  expect(await readFile(prepared.composePath, 'utf8')).toContain('3000/tcp');
});

it('reserves every TCP port in a selected host range and preserves UDP syntax', async () => {
  await writeFile(
    sourcePath,
    stringify({
      services: {
        api: { image: 'app', ports: ['8000-8002:9000-9002', '53:53/udp'] },
      },
    }),
  );
  const prepared = await configure.prepare(sourcePath, 'ranges', {
    ports: [
      mapping('18000-18002', { targetPort: '9000-9002', mappingType: 'range' }),
      mapping('1053', { targetPort: '53', protocol: 'udp' }),
    ],
  });
  expect(prepared.publishedPorts).toEqual([18000, 18001, 18002]);
  const output = await readFile(prepared.composePath, 'utf8');
  expect(output).toContain('18000-18002:9000-9002/tcp');
  expect(output).toContain('1053:53/udp');
});

it.each(['0', '65536', '8080x', '9001-9000', '${HOST_PORT}'])(
  'rejects invalid submitted host port %s',
  async (port) => {
    await expect(
      configure.prepare(sourcePath, 'invalid', { ports: [mapping(port)] }),
    ).rejects.toThrow('Puerto publicado');
  },
);

it('rejects a mapping that changes the original target or belongs to another service', async () => {
  await expect(
    configure.prepare(sourcePath, 'invalid', {
      ports: [mapping('8080', { targetPort: '9999' })],
    }),
  ).rejects.toThrow('no pertenece');
  await expect(
    configure.prepare(sourcePath, 'invalid', {
      ports: [mapping('8080', { service: 'missing' })],
    }),
  ).rejects.toThrow('puerto inválida');
});

it('rejects duplicate host ports and unknown environment services before writing a file', async () => {
  await expect(
    configure.prepare(sourcePath, 'invalid', {
      ports: [mapping('5432')],
    }),
  ).rejects.toThrow('se publica más de una vez');
  await expect(
    configure.prepare(sourcePath, 'invalid', {
      environment: [{ service: 'missing', key: 'MODE', value: 'selected' }],
    }),
  ).rejects.toThrow('servicio inexistente');
});

it('rejects duplicate or invalid environment keys instead of selecting an arbitrary value', async () => {
  await expect(
    configure.prepare(sourcePath, 'invalid', {
      environment: [
        { service: 'api', key: 'MODE', value: 'one' },
        { service: 'api', key: 'MODE', value: 'two' },
      ],
    }),
  ).rejects.toThrow('Variable duplicada');
  await expect(
    configure.prepare(sourcePath, 'invalid', {
      environment: [{ service: 'api', key: 'INVALID KEY', value: 'one' }],
    }),
  ).rejects.toThrow('Variable de entorno inválida');
});
