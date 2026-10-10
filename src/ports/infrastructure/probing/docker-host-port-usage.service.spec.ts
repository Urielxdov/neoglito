import { EventEmitter } from 'node:events';
import { DockerHostPortUsageService } from './docker-host-port-usage.service.js';

const fixtures = vi.hoisted(() => ({ execute: vi.fn(), connect: vi.fn() }));
vi.mock('node:child_process', () => ({
  execFile: Object.assign(vi.fn(), {
    [Symbol.for('nodejs.util.promisify.custom')]: fixtures.execute,
  }),
}));
vi.mock('node:net', () => ({ createConnection: fixtures.connect }));

describe('Docker host port availability', () => {
  beforeEach(() => {
    fixtures.execute.mockReset();
    fixtures.connect.mockReset();
    vi.stubEnv('CONTAINER_PROBE_HOST', 'host.docker.internal');
  });
  afterEach(() => vi.unstubAllEnvs());

  function dockerPorts() {
    fixtures.execute
      .mockResolvedValueOnce({ stdout: 'api\npostgres\nfrontend\nredis\n' })
      .mockResolvedValueOnce({
        stdout: [
          '"/neoglito-api-1" {"3000/tcp":[{"HostPort":"3000"}]}',
          '"/neoglito-postgres-1" {"5432/tcp":[{"HostPort":"5432"},{"HostPort":"5432"}]}',
          '"/neoglito-frontend-1" {"5174/tcp":[{"HostPort":"5174"}]}',
          '"/neoglito-redis-1" {"6379/tcp":[{"HostPort":"6379"}],"1234/tcp":null}',
        ].join('\n'),
      });
  }

  it('reports published host ports and removes duplicate IPv4/IPv6 bindings', async () => {
    dockerPorts();
    const ports = await new DockerHostPortUsageService().getPublishedPorts();
    expect(ports.map(({ port }) => port)).toEqual([3000, 5432, 5174, 6379]);
    expect(ports[1].ownerId).toBe('host:docker:neoglito-postgres-1:port:5432');
  });

  it.each([3000, 5432, 5174, 6379])(
    'rejects Docker host port %s without checking the API container',
    async (port) => {
      dockerPorts();
      await expect(
        new DockerHostPortUsageService().isPortAvailable(port),
      ).resolves.toBe(false);
      expect(fixtures.connect).not.toHaveBeenCalled();
    },
  );

  it('checks non-Docker ports on the configured host instead of inside the container', async () => {
    fixtures.execute.mockResolvedValue({ stdout: '' });
    const socket = Object.assign(new EventEmitter(), {
      setTimeout: vi.fn(),
      destroy: vi.fn(),
    });
    fixtures.connect.mockReturnValue(socket);
    const available = new DockerHostPortUsageService().isPortAvailable(3001);
    await vi.waitFor(() =>
      expect(fixtures.connect).toHaveBeenCalledWith({
        port: 3001,
        host: 'host.docker.internal',
      }),
    );
    socket.emit('connect');
    await expect(available).resolves.toBe(false);
  });

  it('accepts a refused connection as free, but does not claim a timed-out host is free', async () => {
    fixtures.execute.mockResolvedValue({ stdout: '' });
    const socket = Object.assign(new EventEmitter(), {
      setTimeout: vi.fn(),
      destroy: vi.fn(),
    });
    fixtures.connect.mockReturnValue(socket);
    const available = new DockerHostPortUsageService().isPortAvailable(3001);
    await vi.waitFor(() => expect(fixtures.connect).toHaveBeenCalled());
    socket.emit(
      'error',
      Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }),
    );
    await expect(available).resolves.toBe(true);
    fixtures.connect.mockClear();
    const timeout = new DockerHostPortUsageService().isPortAvailable(3002);
    const rejection = expect(timeout).rejects.toThrow('Tiempo de espera');
    await vi.waitFor(() => expect(fixtures.connect).toHaveBeenCalled());
    socket.emit('timeout');
    await rejection;
  });

  it('fails closed if Docker cannot be consulted', async () => {
    fixtures.execute.mockRejectedValue(new Error('Docker unavailable'));
    await expect(
      new DockerHostPortUsageService().isPortAvailable(5432),
    ).rejects.toThrow('No se pudieron comprobar');
    expect(fixtures.connect).not.toHaveBeenCalled();
  });
});
