import { Injectable } from '@nestjs/common';
import type { CachePort } from '../../application/cache.port.js';
import { RedisConnection } from './redis-connection.service.js';

@Injectable()
export class RedisCache implements CachePort {
  constructor(private readonly redis: RedisConnection) {}

  get(key: string): Promise<string | null> {
    return this.redis.client.get(key);
  }

  async getAll(): Promise<Record<string, string>> {
    const entries: Array<[string, string]> = [];

    for await (const keys of this.redis.client.scanIterator({ COUNT: 100 })) {
      const values = await this.redis.client.mGet(keys);

      keys.forEach((key, index) => {
        const value = values[index];
        if (value !== null && value !== undefined) {
          entries.push([key, value]);
        }
      });
    }

    return Object.fromEntries(entries);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl === undefined) {
      await this.redis.client.set(key, value);
      return;
    }

    if (!Number.isInteger(ttl) || ttl <= 0) {
      throw new RangeError(
        'Redis cache TTL must be a positive number of seconds',
      );
    }

    await this.redis.client.set(key, value, { EX: ttl });
  }

  async delete(key: string): Promise<void> {
    await this.redis.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.client.exists(key)) === 1;
  }
}
