export interface RepositoriesState {
  query: string
  selectedIds: Set<number>
}

export type RepositoriesAction =
  | { type: 'query-changed'; query: string }
  | { type: 'repository-toggled'; id: number }
  | { type: 'visible-repositories-toggled'; ids: number[] }
  | { type: 'selection-cleared' }

export const initialRepositoriesState: RepositoriesState = {
  query: '',
  selectedIds: new Set(),
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

      return { ...state, selectedIds }
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

      return { ...state, selectedIds }
    }
    case 'selection-cleared':
      return { ...state, selectedIds: new Set() }
  }
}
