import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RepositoryModule } from '../repository/repository.module.js';
import { COMPOSE_PORT_EXTRACT_PORT } from '../shared/application/compose-port-extract.port.js';
import { ENVIROMENT_VARIABLE_EXTRACT_PORT } from '../shared/application/enviroment-variable-extract.port.js';
import { FILE_FINDER_PORT } from '../shared/application/file-finder.port.js';
import { YamlComposeEnviromentVariableExtractService } from '../shared/infrastructure/compose/yaml-compose-enviroment-variable-extract.service.js';
import { YamlComposePortExtractService } from '../shared/infrastructure/compose/yaml-compose-port-extract.service.js';
import { RecursiveFileFinderService } from '../shared/infrastructure/files/recursive-file-finder.service.js';
import { ProjectAnalysisService } from './application/project-analysis.service.js';

@Module({
  imports: [PrismaModule, RepositoryModule],
  providers: [
    ProjectAnalysisService,
    {
      provide: FILE_FINDER_PORT,
      useClass: RecursiveFileFinderService,
    },
    {
      provide: ENVIROMENT_VARIABLE_EXTRACT_PORT,
      useClass: YamlComposeEnviromentVariableExtractService,
    },
    {
      provide: COMPOSE_PORT_EXTRACT_PORT,
      useClass: YamlComposePortExtractService,
    },
  ],
  exports: [ProjectAnalysisService],
})
export class AnalysisModule {}
