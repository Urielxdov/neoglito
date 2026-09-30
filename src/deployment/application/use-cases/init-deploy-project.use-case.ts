import { Inject, Injectable } from '@nestjs/common';
import { FILE_FINDER_PORT } from '../../../shared/application/file-finder.port.js';
import type { FileFinderPort } from '../../../shared/application/file-finder.port.js';

@Injectable()
export class InitDeployProjectUseCase {
  constructor(
    @Inject(FILE_FINDER_PORT)
    private readonly fileFinderPort: FileFinderPort,
  ) {}

  async execute(repositoryPath: string): Promise<string[]> {
    return this.findDockerComposeFiles(repositoryPath);
  }

  private async findDockerComposeFiles(
    repositoryPath: string,
  ): Promise<string[]> {
    return this.fileFinderPort.findFile(
      repositoryPath,
      /(^|\/)docker-compose.*\.yml$/,
    );
  }
}
