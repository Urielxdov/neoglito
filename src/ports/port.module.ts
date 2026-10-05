import { Module } from '@nestjs/common';
import { PortController } from './presentation/port.controller.js';
import { CacheModule } from '../shared/infrastructure/cache/cache.module.js';
import { PORT_RESERVATION_PORT } from './application/port-reservation.port.js';
import { RedisPortReservationService } from './infrastructure/redis-port-reservation.service.js';

@Module({
  imports: [CacheModule],
  controllers: [PortController],
  providers: [
    RedisPortReservationService,
    {
      provide: PORT_RESERVATION_PORT,
      useExisting: RedisPortReservationService,
    },
  ],
  exports: [PORT_RESERVATION_PORT],
})
export class PortModule {}
