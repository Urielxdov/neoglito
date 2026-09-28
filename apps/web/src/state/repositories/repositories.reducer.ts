import type { Repository } from "@neoglito/web/models/repository"

export type RepositoriesStatus = 'loading' | 'ready' | 'error'

export interface RepositoriesState {
  status: RepositoriesStatus
  repositories: Repository[]
  query: string
  selectedIds: Set<number>
  message: string | null
}

export type RepositoriesAction =
  | { type: 'query-changed'; query: string }
  | { type: 'repository-toggled'; id: number }
  | { type: 'visible-repositories-toggled'; ids: number[] }
  | { type: 'selection-cleared' }

export const initialRepositoriesState: RepositoriesState = {
  status: 'loading',
  repositories: [],
  query: '',
  selectedIds: new Set(),
  message: null,
}

export function repositoriesReducer(
  state: RepositoriesState,
  action: RepositoriesAction,
): RepositoriesState {
  switch (action.type) {
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
  }
}
