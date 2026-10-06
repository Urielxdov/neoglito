import type { RepositoryResponse } from "@neoglito/web/shared/api/contracts"

export interface Repository extends RepositoryResponse {
  updatedAt: string
}
