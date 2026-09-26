import type { IsoDateString } from '@neoglito/shared/api'

export interface RepositoryResponse {
  id: number
  name: string
  private: boolean
  description: string
  language: string
  gitUrl: string
  cloneUrl: string
  updatedAt: IsoDateString
}
