import { apiClient } from "@neoglito/web/api/client"
import type { ApiResponse, AuthenticatedUserResponse } from "@neoglito/web/api/contracts"

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const authService = {
  getGitHubConnectionUrl(): string {
    return `${API_BASE_URL}/auth/github`
  },

  connectWithGitHub(): void {
    window.location.assign(this.getGitHubConnectionUrl())
  },

  getCurrentUser(): Promise<ApiResponse<AuthenticatedUserResponse>> {
    return apiClient.get<AuthenticatedUserResponse>('/auth/me')
  },
}
