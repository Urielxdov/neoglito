import type { DeploymentPortsResponse } from '../apps/web/src/shared/api/contracts.js';
import type { DeployComposePort } from '../apps/web/src/features/deploys/deploys.reducer.js';
import {
  assignedDeploymentPort,
  loadProjectDeploymentPorts,
} from '../apps/web/src/features/projects/deployment-assigned-ports.js';

const path = '/repo/api/compose.yml';
const port: DeployComposePort = {
  dockerComposePath: path,
  service: 'api',
  targetPort: '3000',
  publishedPort: '3000',
  hostIp: null,
  protocol: 'tcp',
  mappingType: 'one-to-one',
};
const assignment: DeploymentPortsResponse = {
  deploymentId: 'deployment-id',
  projectId: 1,
  status: 'running',
  sourceComposePath: path,
  projectDirectory: '/repo/api',
  services: [
    { containerId: 'container', composeServiceName: 'api', port: 3002 },
  ],
};
const assigned = (
  deployments: DeploymentPortsResponse[],
  candidates = [path],
  ports = [port],
) => assignedDeploymentPort(port, ports, candidates, deployments);
const success = (data: unknown) =>
  new Response(
    JSON.stringify({ success: true, data, error: null, meta: null }),
  );

afterEach(() => vi.unstubAllGlobals());

it('loads assigned ports by deployment ID and skips stopped deployments', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      success([
        { id: 'deployment-id', status: 'running' },
        { id: 'old', status: 'stopped' },
      ]),
    )
    .mockResolvedValueOnce(success(assignment));
  vi.stubGlobal('fetch', fetcher);
  expect(await loadProjectDeploymentPorts(1)).toEqual([assignment]);
  expect(fetcher).toHaveBeenNthCalledWith(
    1,
    expect.stringMatching(/\/deployment\/project\/1$/),
    expect.anything(),
  );
  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    expect.stringMatching(/\/deployment\/deployment-id\/ports$/),
    expect.anything(),
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('propagates query errors instead of treating unknown assignments as free', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        success([{ id: 'deployment-id', status: 'running' }]),
      )
      .mockRejectedValueOnce(new Error('offline')),
  );
  await expect(loadProjectDeploymentPorts(1)).rejects.toThrow();
});

it('matches the file and service, using the latest deployment even when an older one has a port', () => {
  expect(assigned([assignment])).toBe('3002');
  expect(
    assigned([{ ...assignment, sourceComposePath: '/other/compose.yml' }]),
  ).toBeNull();
  expect(
    assigned([
      {
        ...assignment,
        services: [{ ...assignment.services[0], composeServiceName: 'db' }],
      },
    ]),
  ).toBeNull();
  expect(
    assigned([
      { ...assignment, services: [{ ...assignment.services[0], port: null }] },
      assignment,
    ]),
  ).toBeNull();
  expect(assigned([{ ...assignment, status: 'stopped' }])).toBeNull();
});

it('supports old configured files only when their directory has an unambiguous candidate', () => {
  const legacy = { ...assignment, sourceComposePath: null };
  expect(assigned([legacy])).toBe('3002');
  expect(assigned([legacy], [path, '/repo/api/production.yml'])).toBeNull();
  expect(assigned([{ ...legacy, projectDirectory: '/other' }])).toBeNull();
});

it('does not copy a single stored port over multiple mappings or UDP', () => {
  expect(
    assigned([assignment], [path], [port, { ...port, targetPort: '9000' }]),
  ).toBeNull();
  expect(
    assignedDeploymentPort(
      { ...port, protocol: 'udp' },
      [port],
      [path],
      [assignment],
    ),
  ).toBeNull();
});
