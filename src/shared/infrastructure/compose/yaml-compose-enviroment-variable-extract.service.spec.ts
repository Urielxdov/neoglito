import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { YamlComposeEnviromentVariableExtractService } from './yaml-compose-enviroment-variable-extract.service.js';

describe('YamlComposeEnviromentVariableExtractService', () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'compose-env-'));
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('extracts service environment variables from map and list syntaxes', async () => {
    const composePath = join(temporaryDirectory, 'docker-compose.yml');
    await writeFile(
      composePath,
      `
services:
  api:
    image: api
    environment:
      NODE_ENV: production
      PORT: \${PORT:-3000}
      EMPTY_FROM_HOST:
      FEATURE_ENABLED: true
  worker:
    image: worker
    environment:
      - QUEUE=emails
      - REDIS_URL=\${REDIS_URL}
      - OPTIONAL_SECRET
  db:
    image: postgres
`,
    );
    const service = new YamlComposeEnviromentVariableExtractService();

    const analysis = await service.analyze(composePath);

    expect(analysis.environmentVariables).toEqual([
      {
        service: 'api',
        name: 'NODE_ENV',
        source: 'literal',
        value: 'production',
        defaultValue: null,
      },
      {
        service: 'api',
        name: 'PORT',
        source: 'interpolation',
        value: 'PORT',
        defaultValue: '3000',
      },
      {
        service: 'api',
        name: 'EMPTY_FROM_HOST',
        source: 'interpolation',
        value: 'EMPTY_FROM_HOST',
        defaultValue: null,
      },
      {
        service: 'api',
        name: 'FEATURE_ENABLED',
        source: 'literal',
        value: 'true',
        defaultValue: null,
      },
      {
        service: 'worker',
        name: 'QUEUE',
        source: 'literal',
        value: 'emails',
        defaultValue: null,
      },
      {
        service: 'worker',
        name: 'REDIS_URL',
        source: 'interpolation',
        value: 'REDIS_URL',
        defaultValue: null,
      },
      {
        service: 'worker',
        name: 'OPTIONAL_SECRET',
        source: 'interpolation',
        value: 'OPTIONAL_SECRET',
        defaultValue: null,
      },
    ]);
  });
});
