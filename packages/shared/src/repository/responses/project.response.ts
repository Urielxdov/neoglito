import type { IsoDateString } from '@neoglito/shared/api'

export interface ProjectRepositoryResponse {
  id: number
  name: string
}

export interface ProjectResponse {
  id: number
  name: string
  description: string
  createdAt: IsoDateString
  updatedAt: IsoDateString
  repositories: ProjectRepositoryResponse[]
}
