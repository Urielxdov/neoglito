import type { IsoDateString } from '../../api/index.js'

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
