import { Module } from '@nestjs/common';
import { COMPOSE_PORT_EXTRACT_PORT } from '../shared/application/compose-port-extract.port.js';
import { FIND_FILES_PORT } from '../shared/application/find-files.port.js';
import { CacheModule } from '../shared/infrastructure/cache/cache.module.js';
import { YamlComposePortExtractService } from '../shared/infrastructure/compose/yaml-compose-port-extract.service.js';
import { FileSystemFindFilesService } from '../shared/infrastructure/file-system/file-system-find-files.service.js';
import { CacheApplicationComposePortsService } from './cache-application-compose-ports.service.js';

@Module({
  imports: [CacheModule],
  providers: [
    CacheApplicationComposePortsService,
    { provide: FIND_FILES_PORT, useClass: FileSystemFindFilesService },
    {
      provide: COMPOSE_PORT_EXTRACT_PORT,
      useClass: YamlComposePortExtractService,
    },
  ],
})
export class StartupModule {}
