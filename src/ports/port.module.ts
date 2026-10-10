import { Module } from '@nestjs/common';
import { PortController } from './presentation/port.controller.js';
import { CacheModule } from '../shared/infrastructure/cache/cache.module.js';
import { PORT_RESERVATION_PORT } from './application/port-reservation.port.js';
import { CONTAINER_PROBE_PORT } from './application/container-probe.port.js';
import { RedisPortReservationService } from './infrastructure/reservations/redis-port-reservation.service.js';
import { TcpContainerProbeService } from './infrastructure/probing/tcp-container-probe.service.js';
import { ContainerModule } from '../container/container.module.js';
import { CONTAINER_CLASSIFICATION_PORT } from './application/container-classification.port.js';
import { ContainerClassificationService } from './infrastructure/classification/container-classification.service.js';
import { HOST_PORT_USAGE_PORT } from './application/host-port-usage.port.js';
import { DockerHostPortUsageService } from './infrastructure/probing/docker-host-port-usage.service.js';

@Module({
  imports: [CacheModule, ContainerModule],
  controllers: [PortController],
  providers: [
    RedisPortReservationService,
    { provide: HOST_PORT_USAGE_PORT, useClass: DockerHostPortUsageService },
    TcpContainerProbeService,
    ContainerClassificationService,
    {
      provide: CONTAINER_CLASSIFICATION_PORT,
      useExisting: ContainerClassificationService,
    },
    {
      provide: PORT_RESERVATION_PORT,
      useExisting: RedisPortReservationService,
    },
    {
      provide: CONTAINER_PROBE_PORT,
      useExisting: TcpContainerProbeService,
    },
  ],
  exports: [
    PORT_RESERVATION_PORT,
    CONTAINER_PROBE_PORT,
    CONTAINER_CLASSIFICATION_PORT,
  ],
})
export class PortModule {}
