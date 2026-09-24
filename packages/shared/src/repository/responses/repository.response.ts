import type { IsoDateString } from '../../api/index.js'

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
