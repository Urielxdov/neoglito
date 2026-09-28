import type {
  ApiResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  InitProjectRequest,
  InitProjectResponse,
  ProjectDockerFilesResponse,
  ProjectResponse,
  UpdateProjectRequest,
} from '../api/contracts'
import { apiClient } from '../api/client'

export const projectService = {
  getAll(): Promise<ApiResponse<ProjectResponse[]>> {
    return apiClient.get<ProjectResponse[]>('/project')
  },

  create(request: CreateProjectRequest): Promise<ApiResponse<CreateProjectResponse>> {
    return apiClient.post<CreateProjectResponse>('/project/registry', request)
  },

  initialize(projectId: number): Promise<ApiResponse<string[]>> {
    return apiClient.post<string[]>('/project/init_project', { projectId })
  },

  init(request: InitProjectRequest): Promise<ApiResponse<InitProjectResponse>> {
    return apiClient.post<InitProjectResponse>('/project/init', request)
  },

  dockerFilesPath(request: InitProjectRequest): Promise<ApiResponse<ProjectDockerFilesResponse>> {
    return apiClient.post<ProjectDockerFilesResponse>('/deployment/docker_files', request)
  },

  environmentVariables(request: InitProjectRequest): Promise<ApiResponse<ProjectDockerFilesResponse>> {
    return apiClient.post<ProjectDockerFilesResponse>('/deployment/docker_files', request)
  },

  update(id: number, request: UpdateProjectRequest): Promise<ApiResponse<ProjectResponse>> {
    return apiClient.post<ProjectResponse>(`/project/${id}/update`, request)
  },
}
