import type {
  ApiResponse,
  DeployComposeRequest,
  DeploymentResponse,
  DeploymentPortsResponse,
} from '@neoglito/web/shared/api/contracts';
import { apiClient } from '@neoglito/web/shared/api/client';

interface DeploymentAnalysisResult {
  response: ApiResponse<DeploymentResponse>;
  classificationError: string | null;
}

export const deploymentService = {
  getPorts(
    deploymentId: string,
  ): Promise<ApiResponse<DeploymentPortsResponse>> {
    return apiClient.get<DeploymentPortsResponse>(
      `/deployment/${encodeURIComponent(deploymentId)}/ports`,
    );
  },

  deploy(
    request: DeployComposeRequest,
  ): Promise<ApiResponse<DeploymentResponse>> {
    console.log('[deployment:http] POST /deployment', {
      projectId: request.projectId,
      composePath: request.composePath,
      mirrorPorts: request.mirrorPorts,
      ports: request.ports,
      environment: request.environment?.map(({ service, key }) => ({
        service,
        key,
      })),
    });
    return apiClient.post<DeploymentResponse>('/deployment', request);
  },

  classify(deploymentId: string): Promise<ApiResponse<DeploymentResponse>> {
    console.log('[deployment:http] POST classify', {
      path: `/deployment/${encodeURIComponent(deploymentId)}/classify`,
      deploymentId,
      body: {},
    });
    return apiClient.post<DeploymentResponse>(
      `/deployment/${encodeURIComponent(deploymentId)}/classify`,
      {},
    );
  },

  async deployAndClassify(
    request: DeployComposeRequest,
  ): Promise<DeploymentAnalysisResult> {
    const deployed = await deploymentService.deploy(request);
    if (!deployed.success || !deployed.data) {
      return { response: deployed, classificationError: null };
    }

    const classified = await deploymentService.classify(deployed.data.id);
    if (classified.success && classified.data) {
      return { response: classified, classificationError: null };
    }

    return {
      response: deployed,
      classificationError: classified.error?.message
        ? `No se pudieron identificar los tipos de servicio: ${classified.error.message}`
        : 'No se pudieron identificar los tipos de servicio.',
    };
  },

  listByProject(projectId: number): Promise<ApiResponse<DeploymentResponse[]>> {
    return apiClient.get<DeploymentResponse[]>(
      `/deployment/project/${projectId}`,
    );
  },
};
