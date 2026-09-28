import type { IsoDateString } from '@neoglito/shared/api'

export interface CreateProjectResponse {
  id: number
  name: string
  description: string
  createdAt: IsoDateString
  updatedAt: IsoDateString
}
