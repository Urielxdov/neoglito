import { Module } from '@nestjs/common';
import { CONTAINER_RUNTIME_PORT } from './application/container-runtime.port.js';
import { DockerComposeRuntime } from './infrastructure/docker/docker-compose-runtime.service.js';

@Module({
  providers: [
    DockerComposeRuntime,
    {
      provide: CONTAINER_RUNTIME_PORT,
      useExisting: DockerComposeRuntime,
    },
  ],
  exports: [CONTAINER_RUNTIME_PORT],
})
export class ContainerModule {}
