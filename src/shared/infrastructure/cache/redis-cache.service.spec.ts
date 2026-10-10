import type { RedisConnection } from './redis-connection.service.js';
import { RedisCache } from './redis-cache.service.js';

describe('RedisCache.getAll', () => {
  it('skips empty SCAN batches and ignores keys that expire before MGET', async () => {
    const client = {
      scanIterator: vi.fn(async function* () {
        yield [];
        yield ['application:compose-ports', 'expired'];
        yield [];
      }),
      mGet: vi.fn(async (keys: string[]) => {
        if (keys.length === 0)
          throw new Error("ERR wrong number of arguments for 'mget' command");
        return ['{"files":[]}', null];
      }),
    };
    const cache = new RedisCache({ client } as unknown as RedisConnection);
    await expect(cache.getAll()).resolves.toEqual({
      'application:compose-ports': '{"files":[]}',
    });
    expect(client.mGet).toHaveBeenCalledExactlyOnceWith([
      'application:compose-ports',
      'expired',
    ]);
  });
});
