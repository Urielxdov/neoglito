import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeployReadiness } from './use-deploy-readiness';
import { useDeploysState } from './deploys.context';
import { usePorts } from '@neoglito/web/features/ports/use-ports';

vi.mock('./deploys.context', () => ({ useDeploysState: vi.fn() }));
vi.mock('@neoglito/web/features/ports/use-ports', () => ({
  usePorts: vi.fn(),
}));

const project = {
  id: 7,
  name: 'test',
  description: 'test',
  repositories: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};
const repository = { id: 1 };

describe('Deployment readiness with occupied ports', () => {
  beforeEach(() => {
    vi.mocked(useDeploysState).mockReturnValue({
      openDeployKey: null,
      deployPaths: { '7:1': 'compose.yml' },
      deployPathCandidates: {},
      deployEnv: {},
      deployPorts: {
        '7:1': [
          {
            service: 'db',
            dockerComposePath: 'compose.yml',
            publishedPort: '5432',
            targetPort: '5432',
            hostIp: null,
            protocol: 'tcp',
            mappingType: 'one-to-one',
          },
        ],
      },
    });
    vi.mocked(usePorts).mockReturnValue({
      reservedPorts: {},
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it('disables analysis when a host container occupies a selected port', () => {
    vi.mocked(usePorts).mockReturnValue({
      reservedPorts: {
        'port-reservation:owner:host:docker:neoglito-postgres-1:port:5432':
          'port-reservation:port:5432',
        'port-reservation:owner:draft:7:port:5432':
          'port-reservation:port:5432',
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refresh: vi.fn(),
    });
    expect(useDeployReadiness(project, [repository]).allReady).toBe(false);
  });

  it('allows a draft belonging to the current project when there is no external conflict', () => {
    vi.mocked(usePorts).mockReturnValue({
      reservedPorts: {
        'port-reservation:owner:draft:7:port:5432':
          'port-reservation:port:5432',
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refresh: vi.fn(),
    });
    expect(useDeployReadiness(project, [repository]).allReady).toBe(true);
  });
});
