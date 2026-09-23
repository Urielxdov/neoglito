import type { IsoDateString } from '../../api/index.js'

export interface CreateProjectResponse {
  id: number
  name: string
  description: string
  createdAt: IsoDateString
  updatedAt: IsoDateString
}
