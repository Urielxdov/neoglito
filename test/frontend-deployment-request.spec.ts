import { createDeploymentRequest } from '../apps/web/src/features/projects/deployment-request.js';
import { getEnvironmentVariablesByRepositoryId } from '../apps/web/src/features/projects/compose.helpers.js';
import type { DeployEnvVar } from '../apps/web/src/features/deploys/deploys.reducer.js';
import type { Repository } from '../apps/web/src/features/repositories/repository.model.js';

it('keeps environment services and defaults without treating interpolation variable names as values', () => {
  const rows = getEnvironmentVariablesByRepositoryId(
    [{ id: 2, name: 'owner/api' } as Repository],
    ['/repo/api'],
    [
      {
        dockerComposePath: '/repo/api/docker-compose.yml',
        ports: [],
        environmentVariables: [
          {
            service: 'api',
            name: 'MODE',
            source: 'literal',
            value: 'production',
            defaultValue: null,
          },
          {
            service: 'api',
            name: 'PASSWORD',
            source: 'interpolation',
            value: 'API_PASSWORD',
            defaultValue: null,
          },
          {
            service: 'db',
            name: 'MODE',
            source: 'interpolation',
            value: 'DB_MODE',
            defaultValue: 'development',
          },
        ],
      },
    ],
  )[2];
  expect(rows).toEqual([
    {
      service: 'api',
      dockerComposePath: '/repo/api/docker-compose.yml',
      key: 'MODE',
      value: 'production',
      required: false,
    },
    {
      service: 'api',
      dockerComposePath: '/repo/api/docker-compose.yml',
      key: 'PASSWORD',
      value: '',
      required: true,
    },
    {
      service: 'db',
      dockerComposePath: '/repo/api/docker-compose.yml',
      key: 'MODE',
      value: 'development',
      required: false,
    },
  ]);
});

it('sends selected Compose values and additional variables without discovery metadata or other files', () => {
  const request = createDeploymentRequest(
    1,
    'C:/repo/docker-compose.yml',
    [
      {
        service: 'api',
        dockerComposePath: 'C:\\repo\\docker-compose.yml',
        key: 'MODE',
        value: 'selected',
        required: false,
      },
      {
        service: 'api',
        dockerComposePath: 'C:/repo/docker-compose.other.yml',
        key: 'MODE',
        value: 'other',
        required: false,
      },
      { key: ' ADDED ', value: 'a=b', required: false },
      { key: '', value: '', required: false },
    ],
    [
      {
        service: 'api',
        dockerComposePath: 'C:/repo/docker-compose.yml',
        targetPort: '3000',
        publishedPort: ' 13000 ',
        hostIp: null,
        protocol: 'tcp',
        mappingType: 'one-to-one',
      },
      {
        service: 'api',
        dockerComposePath: 'C:/repo/docker-compose.other.yml',
        targetPort: '3000',
        publishedPort: '23000',
        hostIp: null,
        protocol: 'tcp',
        mappingType: 'one-to-one',
      },
    ],
  );
  expect(request.environment).toEqual([
    { service: 'api', key: 'MODE', value: 'selected' },
    { key: 'ADDED', value: 'a=b' },
  ]);
  expect(request.mirrorPorts).toBe(true);
  expect(request.ports).toEqual([
    {
      service: 'api',
      targetPort: '3000',
      publishedPort: '13000',
      hostIp: null,
      protocol: 'tcp',
      mappingType: 'one-to-one',
    },
  ]);
});

it('blocks missing required values only for the selected Compose', () => {
  const rows: DeployEnvVar[] = [
    {
      service: 'api',
      dockerComposePath: '/repo/compose.yml',
      key: 'PASSWORD',
      value: '',
      required: true,
    },
  ];
  expect(() =>
    createDeploymentRequest(1, '/repo/compose.yml', rows, []),
  ).toThrow('api:PASSWORD');
  expect(
    createDeploymentRequest(1, '/repo/other.yml', rows, []).environment,
  ).toEqual([]);
});
