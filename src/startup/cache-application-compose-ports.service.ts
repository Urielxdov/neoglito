import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { relative, resolve } from 'node:path';
import {
  CACHE_PORT,
  type CachePort,
} from '../shared/application/cache.port.js';
import {
  COMPOSE_PORT_EXTRACT_PORT,
  type ComposePort,
  type ComposePortExtractPort,
} from '../shared/application/compose-port-extract.port.js';
import {
  FIND_FILES_PORT,
  type FindFilesPort,
} from '../shared/application/find-files.port.js';

export const APPLICATION_COMPOSE_PORTS_CACHE_KEY = 'application:compose-ports';

const COMPOSE_FILE_PATTERNS = [
  'docker-compose.yml',
  'docker-compose.yaml',
  'docker-compose.*.yml',
  'docker-compose.*.yaml',
  'compose.yml',
  'compose.yaml',
  'compose.*.yml',
  'compose.*.yaml',
] as const;

export interface ApplicationComposePortsCache {
  rootPath: string;
  files: Array<{ filePath: string; ports: ComposePort[] }>;
}

@Injectable()
export class CacheApplicationComposePortsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(
    CacheApplicationComposePortsService.name,
  );

  constructor(
    @Inject(FIND_FILES_PORT)
    private readonly fileFinder: FindFilesPort,
    @Inject(COMPOSE_PORT_EXTRACT_PORT)
    private readonly portExtractor: ComposePortExtractPort,
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // The working directory is also where main.ts loads the application's .env.
    const rootPath = resolve(
      process.env.APPLICATION_PORTS_ROOT ?? process.cwd(),
    );
    const filePaths = await this.fileFinder.findFiles(
      rootPath,
      COMPOSE_FILE_PATTERNS,
    );
    const files = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const { ports } = await this.portExtractor.analyze(filePath);
          return { filePath: relative(rootPath, filePath), ports };
        } catch (error) {
          throw new Error(
            `No se pudieron analizar los puertos de ${filePath}`,
            { cause: error },
          );
        }
      }),
    );

    const snapshot: ApplicationComposePortsCache = { rootPath, files };
    // Replace the entire snapshot, including when no Compose files remain.
    await this.cache.set(
      APPLICATION_COMPOSE_PORTS_CACHE_KEY,
      JSON.stringify(snapshot),
    );
    this.logger.log(
      `${files.reduce((total, file) => total + file.ports.length, 0)} puerto(s) de ${files.length} archivo(s) Compose almacenados en Redis`,
    );
  }
}
