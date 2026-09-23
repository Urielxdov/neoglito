import type { IsoDateString } from '../../api/index.js'

export interface GitHubRepositoryResponse {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  visibility?: string
  language: string | null
  updated_at: IsoDateString
}
