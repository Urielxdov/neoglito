import type { ApiResponse, GitHubRepositoryResponse } from '../api/contracts'
import { apiClient } from '../api/client'

export const repositoryService = {
  getAll(): Promise<ApiResponse<GitHubRepositoryResponse[]>> {
    return apiClient.get<GitHubRepositoryResponse[]>('/repository/all')
  },
}
