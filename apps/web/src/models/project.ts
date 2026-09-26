import type { ProjectRepositoryResponse } from "@neoglito/web/api/contracts"

export interface Project {
  id: number
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  repositories: ProjectRepositoryResponse[]
}
