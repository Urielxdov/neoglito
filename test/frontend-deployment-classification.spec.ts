import { deploymentService } from '../apps/web/src/features/projects/deployment.service.js';
import { createDeploymentRequest } from '../apps/web/src/features/projects/deployment-request.js';
import { analysisReducer } from '../apps/web/src/features/analysis/analysis.reducer.js';
import type { DeploymentResponse } from '../apps/web/src/shared/api/contracts.js';

const request = { projectId: 1, composePath: '/repo/compose.yml' };
const deployment: DeploymentResponse = {
  id: 'deployment-id',
  projectId: 1,
  composePath: request.composePath,
  status: 'running',
  createdAt: '2026-10-08T00:00:00.000Z',
  startedAt: null,
  finishedAt: null,
  services: [
    {
      id: 'redis-id',
      composeServiceName: 'redis',
      port: 6379,
      status: 'running',
      health: 'none',
      serviceType: 'UNKNOWN',
      lastObservedAt: '2026-10-08T00:00:00.000Z',
      deploymentId: 'deployment-id',
    },
  ],
};

const succeeded = (data: DeploymentResponse) =>
  new Response(
    JSON.stringify({ success: true, data, error: null, meta: null }),
  );
const failed = (message: string) =>
  new Response(
    JSON.stringify({
      success: false,
      data: null,
      error: { code: 'CONFLICT', message },
      meta: null,
    }),
    { status: 409 },
  );

afterEach(() => vi.unstubAllGlobals());

describe('frontend deployment classification', () => {
  it('classifies the created deployment and returns the updated service types', async () => {
    const configuredRequest = createDeploymentRequest(
      1,
      request.composePath,
      [
        {
          service: 'redis',
          dockerComposePath: request.composePath,
          key: 'MODE',
          value: 'selected',
          required: false,
        },
      ],
      [
        {
          service: 'redis',
          dockerComposePath: request.composePath,
          targetPort: '6379',
          publishedPort: '16379',
          hostIp: null,
          protocol: 'tcp',
          mappingType: 'one-to-one',
        },
      ],
    );
    const classified = {
      ...deployment,
      services: [{ ...deployment.services[0], serviceType: 'MESSAGE_BROKER' }],
    };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(succeeded(deployment))
      .mockResolvedValueOnce(succeeded(classified));
    vi.stubGlobal('fetch', fetcher);

    const result = await deploymentService.deployAndClassify(configuredRequest);
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/deployment$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(configuredRequest),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/deployment\/deployment-id\/classify$/),
      expect.objectContaining({ method: 'POST', body: '{}' }),
    );
    expect(result.response.data?.services[0].serviceType).toBe(
      'MESSAGE_BROKER',
    );
    expect(result.classificationError).toBeNull();
  });

  it('does not classify when deployment fails', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(failed('Deployment failed'));
    vi.stubGlobal('fetch', fetcher);
    const result = await deploymentService.deployAndClassify(request);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(result.response.success).toBe(false);
    expect(result.classificationError).toBeNull();
  });

  it('keeps deployed services visible when classification fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(succeeded(deployment))
        .mockResolvedValueOnce(failed('Containers are starting')),
    );
    const result = await deploymentService.deployAndClassify(request);
    expect(result.response.data).toEqual(deployment);
    expect(result.classificationError).toContain('Containers are starting');

    const state = analysisReducer(null, {
      type: 'analyze-opened',
      projectId: 1,
      repositoryIds: [7],
    });
    const updated = analysisReducer(state, {
      type: 'analyze-repo-succeeded',
      repositoryId: 7,
      deployment: result.response.data!,
      message: result.classificationError,
    });
    expect(updated?.repos[0]).toMatchObject({
      status: 'succeeded',
      deployment,
      message: result.classificationError,
    });
  });

  it('keeps the deployment when the classification request has a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(succeeded(deployment))
        .mockRejectedValueOnce(new Error('Offline')),
    );
    const result = await deploymentService.deployAndClassify(request);
    expect(result.response.success).toBe(true);
    expect(result.response.data).toEqual(deployment);
    expect(result.classificationError).toContain(
      'No fue posible conectar con la API',
    );
  });
});
