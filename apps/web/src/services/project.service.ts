import type { ApiResponse, CreateProjectRequest, CreateProjectResponse, ProjectResponse } from '../api/contracts'
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
}
