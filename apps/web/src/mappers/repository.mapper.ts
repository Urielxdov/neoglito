import type { RepositoryResponse } from '../api/contracts'
import type { Repository } from '../models/repository'

export function toRepository(repository: RepositoryResponse): Repository {
  return {
    id: repository.id,
    name: repository.name,
    private: repository.private,
    description: repository.description,
    language: repository.language,
    gitUrl: repository.gitUrl,
    cloneUrl: repository.cloneUrl,
    updatedAt: new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(repository.updatedAt)),
  }
}
