import type { RedisConnection } from '../../../shared/infrastructure/cache/redis-connection.service.js';
import { RedisPortReservationService } from './redis-port-reservation.service.js';

describe('RedisPortReservationService.getAll', () => {
  function setup(batches: string[][], values: Array<string | null> = []) {
    const client = {
      scanIterator: vi.fn(async function* () {
        for (const batch of batches) yield batch;
      }),
      mGet: vi.fn(async (keys: string[]) => {
        if (keys.length === 0)
          throw new Error("ERR wrong number of arguments for 'mget' command");
        return values;
      }),
    };
    return {
      client,
      service: new RedisPortReservationService(
        {
          client,
        } as unknown as RedisConnection,
        {
          getPublishedPorts: vi.fn(async () => []),
          isPortAvailable: vi.fn(async () => true),
        },
      ),
    };
  }

  it('returns an empty list when Redis has no matching reservations', async () => {
    const { service, client } = setup([[], []]);
    await expect(service.getAll()).resolves.toEqual({});
    expect(client.mGet).not.toHaveBeenCalled();
  });

  it('skips empty SCAN batches while reading valid reservations', async () => {
    const owner = 'port-reservation:owner:draft:7:port:3000';
    const { service, client } = setup([[], [owner], []], ['3000']);
    await expect(service.getAll()).resolves.toEqual({
      [owner]: 'port-reservation:port:3000',
    });
    expect(client.mGet).toHaveBeenCalledExactlyOnceWith([owner]);
    expect(client.scanIterator).toHaveBeenCalledWith({
      MATCH: 'port-reservation:owner:*',
      COUNT: 100,
    });
  });

  it('ignores expired reservations and invalid port values', async () => {
    const { service } = setup(
      [['expired', 'invalid', 'out-of-range', 'valid']],
      [null, 'invalid', '70000', '6379'],
    );
    await expect(service.getAll()).resolves.toEqual({
      valid: 'port-reservation:port:6379',
    });
  });
});

describe('Redis reservations with occupied host ports', () => {
  it('includes occupied Docker ports in GET /port and rejects drafts and deployment holds', async () => {
    const client = {
      scanIterator: vi.fn(async function* () {
        yield [];
      }),
      get: vi.fn(async () => null),
      eval: vi.fn(),
    };
    const hostPortUsage = {
      getPublishedPorts: vi.fn(async () => [
        { port: 5432, ownerId: 'host:docker:neoglito-postgres-1:port:5432' },
      ]),
      isPortAvailable: vi.fn(async () => false),
    };
    const service = new RedisPortReservationService(
      { client } as unknown as RedisConnection,
      hostPortUsage,
    );
    await expect(service.getAll()).resolves.toEqual({
      'port-reservation:owner:host:docker:neoglito-postgres-1:port:5432':
        'port-reservation:port:5432',
    });
    await expect(
      service.reservePort(5432, 'draft:1:port:5432', 300),
    ).resolves.toBe(false);
    await expect(
      service.holdPort(5432, 'deployment:new:port:5432'),
    ).resolves.toBeNull();
    expect(client.eval).not.toHaveBeenCalled();
  });
});
