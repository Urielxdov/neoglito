import { Module } from '@nestjs/common';
import { CACHE_PORT } from '../../application/cache.port.js';
import { PORT_RESERVATION_PORT } from '../../application/port-reservation.port.js';
import { RedisConnection } from './redis-connection.service.js';
import { RedisCache } from './redis-cache.service.js';
import { RedisPortReservationService } from './redis-port-reservation.service.js';

@Module({
  providers: [
    RedisConnection,
    RedisCache,
    RedisPortReservationService,
    {
      provide: CACHE_PORT,
      useExisting: RedisCache,
    },
    {
      provide: PORT_RESERVATION_PORT,
      useExisting: RedisPortReservationService,
    },
  ],
  exports: [CACHE_PORT, PORT_RESERVATION_PORT],
})
export class CacheModule {}
