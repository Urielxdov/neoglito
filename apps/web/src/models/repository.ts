import type { RepositoryResponse } from "@neoglito/web/api/contracts"

export interface Repository extends RepositoryResponse {
  updatedAt: string
}
