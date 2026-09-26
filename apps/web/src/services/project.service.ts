import type {
  ApiResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  InitProjectRequest,
  InitProjectResponse,
  ProjectDockerFilesResponse,
  ProjectResponse,
} from "@neoglito/web/api/contracts";
import { apiClient } from "@neoglito/web/api/client";

export const projectService = {
  getAll(): Promise<ApiResponse<ProjectResponse[]>> {
    return apiClient.get<ProjectResponse[]>('/project');
  },

  create(
    request: CreateProjectRequest,
  ): Promise<ApiResponse<CreateProjectResponse>> {
    return apiClient.post<CreateProjectResponse>('/project/registry', request);
  },

  init(request: InitProjectRequest): Promise<ApiResponse<InitProjectResponse>> {
    return apiClient.post<InitProjectResponse>('/project/init', request);
  },

  dockerFilesPath(
    request: InitProjectRequest,
  ): Promise<ApiResponse<ProjectDockerFilesResponse>> {
    return apiClient.post<ProjectDockerFilesResponse>(
      '/project/docker_files',
      request,
    );
  },
};
