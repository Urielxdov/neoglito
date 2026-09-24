import type { RepositoryResponse } from '../api/contracts'

export interface Repository extends RepositoryResponse {
  updatedAt: string
}
