import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stringify } from 'yaml';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { DockerComposeRuntime } from './docker-compose-runtime.service.js';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  existsSync: vi.fn(() => false),
}));
vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }));

function respond(output: string, code = 0) {
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
  });
  vi.mocked(spawn).mockImplementationOnce(() => {
    queueMicrotask(() => {
      child.stdout.emit('data', Buffer.from(output));
      child.emit('close', code);
    });
    return child as unknown as ReturnType<typeof spawn>;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(existsSync).mockReturnValue(false);
});

describe('DockerComposeRuntime', () => {
  it('inspects its own mounts once to resolve checkout bind sources on the Docker host', async () => {
    vi.mocked(existsSync).mockReturnValue(true);
    respond(
      JSON.stringify([
        {
          Mounts: [
            { Type: 'bind', Source: '/host/project', Destination: '/app' },
          ],
        },
      ]),
    );
    const runtime = new DockerComposeRuntime();
    expect(await runtime.resolveHostPath('/app/repo/user/app')).toBe(
      '/host/project/repo/user/app',
    );
    expect(await runtime.resolveHostPath('/app/repo/user/app/config')).toBe(
      '/host/project/repo/user/app/config',
    );
    expect(spawn).toHaveBeenCalledOnce();
    expect(spawn).toHaveBeenCalledWith(
      'docker',
      ['container', 'inspect', expect.any(String)],
      expect.any(Object),
    );
  });

  it('keeps local filesystem paths when the API runs directly on the host', async () => {
    expect(
      await new DockerComposeRuntime().resolveHostPath('C:/repo/project'),
    ).toBe('C:/repo/project');
    expect(spawn).not.toHaveBeenCalled();
  });
  it('uses the same explicit project for up, list and down even if the host defines another project', async () => {
    vi.stubEnv('COMPOSE_PROJECT_NAME', 'existing-neoglito');
    vi.mocked(readFile).mockResolvedValue(
      stringify({
        'x-neoglito': { projectDirectory: resolve('/source/repo') },
      }),
    );
    respond('');
    respond('[]');
    respond('');
    const runtime = new DockerComposeRuntime();
    try {
      await runtime.up('/repo', 'configured.yml', 'neoglito-new');
      await runtime.list('/repo', 'configured.yml', 'neoglito-new');
      await runtime.down('/repo', 'configured.yml', 'neoglito-new');
      for (const [executable, args] of vi.mocked(spawn).mock.calls) {
        expect(executable).toBe('docker');
        expect(args?.slice(0, 7)).toEqual([
          'compose',
          '-p',
          'neoglito-new',
          '--project-directory',
          resolve('/source/repo'),
          '-f',
          'configured.yml',
        ]);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('refuses a configured deployment without its original project directory', async () => {
    vi.mocked(readFile).mockResolvedValue('services: {}');
    await expect(
      new DockerComposeRuntime().up(
        '/configs',
        'configured.yml',
        'neoglito-new',
      ),
    ).rejects.toThrow('directorio de proyecto');
    expect(spawn).not.toHaveBeenCalled();
  });
  it('lists services without published ports and ignores UDP publications', async () => {
    respond(
      JSON.stringify([
        { ID: 'worker', Service: 'worker', State: 'running', Publishers: [] },
        {
          ID: 'api',
          Service: 'api',
          State: 'running',
          Publishers: [
            { Protocol: 'udp', PublishedPort: 53 },
            { Protocol: 'tcp', PublishedPort: 8080 },
          ],
        },
      ]),
    );
    const containers = await new DockerComposeRuntime().list(
      'C:/repo with spaces',
      'compose.yml',
    );
    expect(
      containers.map((container) => [container.containerId, container.port]),
    ).toEqual([
      ['worker', 0],
      ['api', 8080],
    ]);
    expect(spawn).toHaveBeenCalledWith(
      'docker',
      ['compose', '-f', 'compose.yml', 'ps', '--all', '--format', 'json'],
      expect.objectContaining({
        cwd: 'C:/repo with spaces',
        shell: false,
        windowsHide: true,
      }),
    );
  });

  it('accepts newline-delimited Compose output', async () => {
    respond(
      '{"ID":"db","Service":"db","Publishers":[]}\n{"ID":"api","Service":"api","Publishers":[]}',
    );
    expect(
      await new DockerComposeRuntime().list('/repo', 'compose.yml'),
    ).toHaveLength(2);
  });

  it('inspects image references, commands, aliases, environment values and all published TCP ports', async () => {
    respond(
      JSON.stringify([
        {
          Id: 'redis-id',
          Name: '/demo-redis-1',
          Config: {
            Image: 'redis:7',
            Entrypoint: ['docker-entrypoint.sh'],
            Cmd: ['redis-server'],
            Env: ['TOKEN=a=b=c', 'EMPTY=', 'NOT_ASSIGNED'],
            Labels: { 'com.docker.compose.service': 'redis' },
          },
          NetworkSettings: {
            Networks: {
              default: { Aliases: ['redis', 'demo-redis-1', 'cache'] },
            },
            Ports: {
              '6379/tcp': [
                { HostIp: '0.0.0.0', HostPort: '16379' },
                { HostIp: '::', HostPort: '16379' },
              ],
              '6380/tcp': [{ HostPort: '16380' }, { HostPort: 'bad' }],
              '53/udp': [{ HostPort: '53' }],
              '9000/tcp': null,
            },
          },
        },
      ]),
    );
    expect(await new DockerComposeRuntime().inspect(['redis-id'])).toEqual([
      {
        containerId: 'redis-id',
        image: 'redis:7',
        command: ['docker-entrypoint.sh', 'redis-server'],
        aliases: ['redis', 'demo-redis-1', 'cache'],
        ports: [16379, 16380],
        env: { TOKEN: 'a=b=c', EMPTY: '' },
      },
    ]);
    expect(spawn).toHaveBeenCalledWith(
      'docker',
      ['container', 'inspect', 'redis-id'],
      expect.objectContaining({ shell: false, timeout: 10_000 }),
    );
  });

  it('does not run inspect when there are no containers', async () => {
    expect(await new DockerComposeRuntime().inspect([])).toEqual([]);
    expect(spawn).not.toHaveBeenCalled();
  });

  it('reads config files and lists directory entries without a shell', async () => {
    respond('server { proxy_pass http://api; }');
    respond('default.conf\nextra.conf\n');
    const runtime = new DockerComposeRuntime();
    expect(
      await runtime.readFile('nginx-id', '/etc/nginx/nginx.conf'),
    ).toContain('proxy_pass');
    expect(await runtime.listFiles('nginx-id', '/etc/nginx/conf.d')).toEqual([
      'default.conf',
      'extra.conf',
    ]);
    expect(spawn).toHaveBeenCalledWith(
      'docker',
      ['exec', 'nginx-id', 'cat', '/etc/nginx/nginx.conf'],
      expect.objectContaining({ shell: false, timeout: 5_000 }),
    );
  });

  it('hides the auxiliary init services added by the telemetry injector', async () => {
    respond(
      JSON.stringify([
        { ID: 'api', Service: 'api', State: 'running', Publishers: [] },
        {
          ID: 'init',
          Service: 'neoglito-otel-init-nodejs',
          State: 'exited',
          Publishers: [],
        },
      ]),
    );
    const containers = await new DockerComposeRuntime().list('/repo', 'c.yml');
    expect(containers.map((container) => container.composeServiceName)).toEqual([
      'api',
    ]);
  });

  it('treats missing config files and directories as unavailable evidence', async () => {
    respond('', 1);
    respond('', 1);
    const runtime = new DockerComposeRuntime();
    expect(await runtime.readFile('nginx-id', '/missing')).toBeNull();
    expect(await runtime.listFiles('nginx-id', '/missing')).toEqual([]);
  });

  it('rejects failed inspection instead of silently returning partial context', async () => {
    respond('No such container', 1);
    await expect(
      new DockerComposeRuntime().inspect(['missing']),
    ).rejects.toThrow('No such container');
  });
});
