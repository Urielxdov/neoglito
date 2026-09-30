import { Module } from '@nestjs/common';
import { CacheModule } from '../shared/infrastructure/cache/cache.module.js';
import { CONTAINER_RUNTIME_PORT } from './application/container-runtime.port.js';
import { PORT_RESERVATION_PORT } from '../ports/application/port-reservation.port.js';
import { DockerComposeRuntime } from './infrastructure/docker/docker-compose-runtime.service.js';
import { RedisPortReservationService } from './infrastructure/ports/redis-port-reservation.service.js';

@Module({
  imports: [CacheModule],
  providers: [
    DockerComposeRuntime,
    RedisPortReservationService,
    {
      provide: CONTAINER_RUNTIME_PORT,
      useExisting: DockerComposeRuntime,
    },
    {
      provide: PORT_RESERVATION_PORT,
      useExisting: RedisPortReservationService,
    },
  ],
  exports: [CONTAINER_RUNTIME_PORT, PORT_RESERVATION_PORT],
})
export class ContainerModule {}
