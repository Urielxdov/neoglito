import type { EnviromentVariableExtractPort } from './enviroment-variable-extract.port.js';
import { ExtractEnvironmentVariablesUseCase } from './extract-environment-variables.use-case.js';

describe('ExtractEnvironmentVariablesUseCase', () => {
  it('analyzes every compose file path', async () => {
    const analyzedPaths: string[] = [];
    const enviromentVariableExtract: EnviromentVariableExtractPort = {
      async analyze(filePath) {
        analyzedPaths.push(filePath);

        return {
          environmentVariables: [
            {
              service: 'api',
              name: 'PORT',
              source: 'interpolation',
              value: 'PORT',
              defaultValue: '3000',
            },
          ],
        };
      },
    };
    const useCase = new ExtractEnvironmentVariablesUseCase(
      enviromentVariableExtract,
    );

    const analysis = await useCase.execute([
      '/repo/api/docker-compose.yml',
      '/repo/web/docker-compose.yml',
    ]);

    expect(analyzedPaths).toEqual([
      '/repo/api/docker-compose.yml',
      '/repo/web/docker-compose.yml',
    ]);
    expect(analysis).toEqual([
      {
        filePath: '/repo/api/docker-compose.yml',
        environmentVariables: [
          {
            service: 'api',
            name: 'PORT',
            source: 'interpolation',
            value: 'PORT',
            defaultValue: '3000',
          },
        ],
      },
      {
        filePath: '/repo/web/docker-compose.yml',
        environmentVariables: [
          {
            service: 'api',
            name: 'PORT',
            source: 'interpolation',
            value: 'PORT',
            defaultValue: '3000',
          },
        ],
      },
    ]);
  });
});
