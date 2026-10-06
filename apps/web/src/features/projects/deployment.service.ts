import type {
  ApiResponse,
  DeployComposeRequest,
  DeploymentResponse,
} from "@neoglito/web/shared/api/contracts";
import { apiClient } from "@neoglito/web/shared/api/client";

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
