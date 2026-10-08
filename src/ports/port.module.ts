import { Module } from '@nestjs/common';
import { PortController } from './presentation/port.controller.js';
import { CacheModule } from '../shared/infrastructure/cache/cache.module.js';
import { PORT_RESERVATION_PORT } from './application/port-reservation.port.js';
import { CONTAINER_PROBE_PORT } from './application/container-probe.port.js';
import { RedisPortReservationService } from './infrastructure/redis-port-reservation.service.js';
import { TcpContainerProbeService } from './infrastructure/tcp-container-probe.service.js';

@Module({
  imports: [CacheModule],
  controllers: [PortController],
  providers: [
    RedisPortReservationService,
    TcpContainerProbeService,
    {
      provide: PORT_RESERVATION_PORT,
      useExisting: RedisPortReservationService,
    },
    {
      provide: CONTAINER_PROBE_PORT,
      useExisting: TcpContainerProbeService,
    },
  ],
  exports: [PORT_RESERVATION_PORT, CONTAINER_PROBE_PORT],
})
export class PortModule {}
