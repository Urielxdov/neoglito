import type { IsoDateString } from '../../api/index.js'

export interface CreateRepositoryResponse {
  id: number
  projectId: number
  cloneUrl: string
  technology: string | null
  createdAt: IsoDateString
  updatedAt: IsoDateString
}
