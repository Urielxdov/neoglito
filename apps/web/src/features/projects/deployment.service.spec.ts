import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@neoglito/web/shared/api/client';
import { deploymentService } from './deployment.service';

vi.mock('@neoglito/web/shared/api/client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

describe('Saved deployment analysis', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recovers persisted deployments using only the existing GET endpoint', async () => {
    const data = [{ id: 'existing-deployment', services: [] }];
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data,
      error: null,
      meta: null,
    });
    expect(await deploymentService.getSavedAnalysis(7)).toEqual(data);
    expect(apiClient.get).toHaveBeenCalledExactlyOnceWith(
      '/deployment/project/7',
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('propagates server unavailability rather than returning an empty analysis', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: false,
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: 'No fue posible conectar con la API',
      },
      meta: null,
    });
    await expect(deploymentService.getSavedAnalysis(7)).rejects.toThrow(
      'No fue posible conectar con la API',
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
