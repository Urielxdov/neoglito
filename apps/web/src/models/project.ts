import type { ProjectRepositoryResponse } from '../api/contracts'

export interface Project {
  id: number
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  repositories: ProjectRepositoryResponse[]
}
