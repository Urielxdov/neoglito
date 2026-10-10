import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CachePort } from '../shared/application/cache.port.js';
import { YamlComposePortExtractService } from '../shared/infrastructure/compose/yaml-compose-port-extract.service.js';
import { FileSystemFindFilesService } from '../shared/infrastructure/file-system/file-system-find-files.service.js';
import {
  APPLICATION_COMPOSE_PORTS_CACHE_KEY,
  CacheApplicationComposePortsService,
  type ApplicationComposePortsCache,
} from './cache-application-compose-ports.service.js';

describe('CacheApplicationComposePortsService', () => {
  let root: string;
  let cache: CachePort;
  let service: CacheApplicationComposePortsService;
  let values: Map<string, string>;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'application-compose-ports-'));
    vi.stubEnv('APPLICATION_PORTS_ROOT', root);
    values = new Map();
    cache = {
      get: vi.fn(async (key) => values.get(key) ?? null),
      getAll: vi.fn(async () => Object.fromEntries(values)),
      set: vi.fn(async (key, value) => {
        values.set(key, value);
      }),
      delete: vi.fn(async (key) => {
        values.delete(key);
      }),
      exists: vi.fn(async (key) => values.has(key)),
    };
    service = new CacheApplicationComposePortsService(
      new FileSystemFindFilesService(),
      new YamlComposePortExtractService(),
      cache,
    );
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
  });

  function snapshot(): ApplicationComposePortsCache {
    return JSON.parse(values.get(APPLICATION_COMPOSE_PORTS_CACHE_KEY)!);
  }

  it('caches short and long syntax, protocols, ranges and nested Compose files', async () => {
    await writeFile(
      join(root, 'docker-compose.yml'),
      `
services:
  api:
    ports:
      - "127.0.0.1:3000:3000"
      - target: 53
        published: "5353"
        protocol: udp
  worker:
    ports:
      - "8000-8002:9000-9002"
      - 9090
`,
    );
    await mkdir(join(root, 'infra'));
    await writeFile(
      join(root, 'infra', 'compose.prod.yaml'),
      'services: { db: { ports: ["5432:5432"] } }',
    );
    for (const directory of [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
    ]) {
      await mkdir(join(root, directory));
      await writeFile(join(root, directory, 'compose.yaml'), 'invalid: [');
    }
    await writeFile(join(root, 'Dockerfile'), 'EXPOSE 1234');

    await service.onApplicationBootstrap();

    expect(snapshot()).toEqual({
      rootPath: root,
      files: [
        {
          filePath: 'docker-compose.yml',
          ports: [
            {
              service: 'api',
              hostIp: '127.0.0.1',
              publishedPort: '3000',
              targetPort: '3000',
              protocol: 'tcp',
              mappingType: 'one-to-one',
            },
            {
              service: 'api',
              hostIp: null,
              publishedPort: '5353',
              targetPort: '53',
              protocol: 'udp',
              mappingType: 'one-to-one',
            },
            {
              service: 'worker',
              hostIp: null,
              publishedPort: '8000-8002',
              targetPort: '9000-9002',
              protocol: 'tcp',
              mappingType: 'range',
            },
            {
              service: 'worker',
              hostIp: null,
              publishedPort: null,
              targetPort: '9090',
              protocol: 'tcp',
              mappingType: 'one-to-one',
            },
          ],
        },
        {
          filePath: join('infra', 'compose.prod.yaml'),
          ports: [
            {
              service: 'db',
              hostIp: null,
              publishedPort: '5432',
              targetPort: '5432',
              protocol: 'tcp',
              mappingType: 'one-to-one',
            },
          ],
        },
      ],
    });
    expect(cache.set).toHaveBeenCalledTimes(1);
  });

  it('replaces stale data even when no Compose files remain', async () => {
    values.set(APPLICATION_COMPOSE_PORTS_CACHE_KEY, '{"files":["old"]}');
    await service.onApplicationBootstrap();
    expect(snapshot()).toEqual({ rootPath: root, files: [] });
  });

  it('uses the working directory by default', async () => {
    vi.unstubAllEnvs();
    const previousRoot = process.env.APPLICATION_PORTS_ROOT;
    delete process.env.APPLICATION_PORTS_ROOT;
    vi.spyOn(process, 'cwd').mockReturnValue(root);
    try {
      await service.onApplicationBootstrap();
      expect(snapshot().rootPath).toBe(root);
    } finally {
      if (previousRoot !== undefined)
        process.env.APPLICATION_PORTS_ROOT = previousRoot;
    }
  });

  it('fails startup with the filename and preserves the cache when YAML is invalid', async () => {
    values.set(APPLICATION_COMPOSE_PORTS_CACHE_KEY, 'previous snapshot');
    const filePath = join(root, 'compose.yml');
    await writeFile(filePath, 'services: [');
    await expect(service.onApplicationBootstrap()).rejects.toThrow(filePath);
    expect(cache.set).not.toHaveBeenCalled();
    expect(values.get(APPLICATION_COMPOSE_PORTS_CACHE_KEY)).toBe(
      'previous snapshot',
    );
  });

  it('propagates Redis failures instead of announcing a successful startup cache', async () => {
    vi.mocked(cache.set).mockRejectedValue(new Error('Redis unavailable'));
    await expect(service.onApplicationBootstrap()).rejects.toThrow(
      'Redis unavailable',
    );
  });
});
