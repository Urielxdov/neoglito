import { Module } from '@nestjs/common';
import { CACHE_PORT } from '../../application/cache.port.js';
import { RedisConnection } from './redis-connection.service.js';
import { RedisCache } from './redis-cache.service.js';

@Module({
  providers: [
    RedisConnection,
    RedisCache,
    {
      provide: CACHE_PORT,
      useExisting: RedisCache,
    },
  ],
  exports: [CACHE_PORT, RedisConnection],
})
export class CacheModule {}
