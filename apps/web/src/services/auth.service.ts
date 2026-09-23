import { apiClient } from '../api/client'
import type { ApiResponse } from '../api/contracts'

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

interface AuthenticatedUser {
  id: number
  username: string
}

export const authService = {
  getGitHubConnectionUrl(): string {
    return `${API_BASE_URL}/auth/github`
  },

  connectWithGitHub(): void {
    window.location.assign(this.getGitHubConnectionUrl())
  },

  getCurrentUser(): Promise<ApiResponse<AuthenticatedUser>> {
    return apiClient.get<AuthenticatedUser>('/auth/me')
  },
}
