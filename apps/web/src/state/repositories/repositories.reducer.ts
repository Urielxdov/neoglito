import type { GitHubRepositoryResponse } from '../../api/contracts'
import type { GitHubRepository } from '../../components/repositories/repository-list-item'

export type RepositoriesStatus = 'loading' | 'ready' | 'error'

export interface RepositoriesState {
  status: RepositoriesStatus
  repositories: GitHubRepository[]
  query: string
  selectedIds: Set<number>
  message: string | null
}

export type RepositoriesAction =
  | { type: 'load-succeeded'; repositories: GitHubRepositoryResponse[] }
  | { type: 'load-failed'; message: string }
  | { type: 'query-changed'; query: string }
  | { type: 'repository-toggled'; id: number }
  | { type: 'visible-repositories-toggled'; ids: number[] }
  | { type: 'selection-cleared' }
  | { type: 'analysis-requested' }

export const initialRepositoriesState: RepositoriesState = {
  status: 'loading',
  repositories: [],
  query: '',
  selectedIds: new Set(),
  message: null,
}

function toRepository(repository: GitHubRepositoryResponse): GitHubRepository {
  return {
    id: repository.id,
    name: repository.full_name || repository.name,
    description: repository.description ?? 'Sin descripción',
    visibility: repository.private ? 'Privado' : 'Público',
    language: repository.language ?? 'Sin lenguaje',
    updatedAt: new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(repository.updated_at)),
  }
}

export function repositoriesReducer(
  state: RepositoriesState,
  action: RepositoriesAction,
): RepositoriesState {
  switch (action.type) {
    case 'load-succeeded':
      return {
        ...state,
        status: 'ready',
        repositories: action.repositories.map(toRepository),
      }
    case 'load-failed':
      return { ...state, status: 'error', message: action.message }
    case 'query-changed':
      return { ...state, query: action.query }
    case 'repository-toggled': {
      const selectedIds = new Set(state.selectedIds)

      if (selectedIds.has(action.id)) {
        selectedIds.delete(action.id)
      } else {
        selectedIds.add(action.id)
      }

      return { ...state, selectedIds, message: null }
    }
    case 'visible-repositories-toggled': {
      const selectedIds = new Set(state.selectedIds)
      const allSelected = action.ids.every((id) => selectedIds.has(id))

      for (const id of action.ids) {
        if (allSelected) {
          selectedIds.delete(id)
        } else {
          selectedIds.add(id)
        }
      }

      return { ...state, selectedIds, message: null }
    }
    case 'selection-cleared':
      return { ...state, selectedIds: new Set(), message: null }
    case 'analysis-requested':
      return {
        ...state,
        message: state.selectedIds.size > 0
          ? `${state.selectedIds.size} repositorio(s) preparado(s) para análisis.`
          : 'Selecciona al menos un repositorio para analizar.',
      }
  }
}
