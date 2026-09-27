import type {
  ApiResponse,
  DeployComposeRequest,
  DeploymentResponse,
} from "@neoglito/web/api/contracts";
import { apiClient } from "@neoglito/web/api/client";

export const deploymentService = {
  deploy(
    request: DeployComposeRequest,
  ): Promise<ApiResponse<DeploymentResponse>> {
    return apiClient.post<DeploymentResponse>('/deployment', request);
  },

  listByProject(
    projectId: number,
  ): Promise<ApiResponse<DeploymentResponse[]>> {
    return apiClient.get<DeploymentResponse[]>(
      `/deployment/project/${projectId}`,
    );
  },
};
