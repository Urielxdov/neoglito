import type { ApiResponse, CreateRepositoryRequest, CreateRepositoryResponse, RepositoryResponse } from "@neoglito/web/api/contracts"
import { apiClient } from "@neoglito/web/api/client"

export const repositoryService = {
  getAll(): Promise<ApiResponse<RepositoryResponse[]>> {
    return apiClient.get<RepositoryResponse[]>('/repository/all')
  },

  create(request: CreateRepositoryRequest): Promise<ApiResponse<CreateRepositoryResponse>> {
    return apiClient.post<CreateRepositoryResponse>('/repository/registry', request)
  },
}
