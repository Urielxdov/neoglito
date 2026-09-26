import type { FileFinderPort } from '../../../shared/application/file-finder.port.js';
import { InitDeployProjectUseCase } from './init-deploy-project.use-case.js';

describe('InitDeployProjectUseCase', () => {
  it('finds docker-compose yml files from the given repository path', async () => {
    const fileFinderPort: FileFinderPort = {
      async findFile(
        directoryPath: string,
        pattern: RegExp,
      ): Promise<string[]> {
        const files = [
          'docker-compose.yml',
          'docker-compose.prod.yml',
          'apps/api/docker-compose.local.yml',
          'apps/api/docker-compose.yaml',
          'apps/web/compose.yml',
          'apps/web/my-docker-compose.yml',
        ];

        return files
          .filter((file) => {
            pattern.lastIndex = 0;
            return pattern.test(file);
          })
          .map((file) => `${directoryPath}/${file}`);
      },
    };
    const useCase = new InitDeployProjectUseCase(fileFinderPort);

    const files = await useCase.execute('/repositories/demo');

    expect(files).toEqual([
      '/repositories/demo/docker-compose.yml',
      '/repositories/demo/docker-compose.prod.yml',
      '/repositories/demo/apps/api/docker-compose.local.yml',
    ]);
  });
});
