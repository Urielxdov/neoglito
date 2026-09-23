import { useEffect, useReducer, useState } from 'react'
import { RepositoryListItem } from '../../components/repositories/repository-list-item'
import { repositoryService } from '../../services/repository.service'
import { useAuth } from '../../state/auth/auth-context'
import {
  initialRepositoriesState,
  repositoriesReducer,
} from '../../state/repositories/repositories.reducer'

export default function RepositorySelectionPage() {
  const { user } = useAuth()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [state, dispatch] = useReducer(repositoriesReducer, initialRepositoriesState)

  const dark = theme === 'dark'
  const normalizedQuery = state.query.trim().toLowerCase()
  const visibleRepositories = state.repositories.filter((repository) => (
    repository.name.toLowerCase().includes(normalizedQuery)
    || repository.description.toLowerCase().includes(normalizedQuery)
  ))

  useEffect(() => {
    const loadRepositories = async () => {
      const response = await repositoryService.getAll()

      if (response.success && response.data) {
        dispatch({ type: 'load-succeeded', repositories: response.data })
        return
      }

      dispatch({
        type: 'load-failed',
        message: response.error?.message ?? 'No fue posible cargar los repositorios.',
      })
    }

    void loadRepositories()
  }, [])

  const allVisibleRepositoriesSelected = visibleRepositories.length > 0
    && visibleRepositories.every((repository) => state.selectedIds.has(repository.id))

  return (
    <main
      data-theme={theme}
      className="min-h-screen bg-[#f8fafc] px-6 pb-20 pt-14 font-sans text-[#16202e] dark:bg-[#0c121d] dark:text-[#e8edf6]"
    >
      <div className="mx-auto flex w-full max-w-[680px] items-center justify-between gap-4">
        <span className="text-[13px] font-semibold uppercase tracking-[0.09em] text-[#8c98ac] dark:text-[#7a8699]">
          Repositorios
        </span>
        <button
          type="button"
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          className="inline-flex h-[34px] items-center gap-2 rounded-lg border border-[#d6dce5] bg-white px-[13px] text-[12.5px] font-semibold text-[#51607a] transition-colors hover:bg-[#f1f5f9] dark:border-[#2e3a51] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]"
        >
          <span>{dark ? '☀' : '☾'}</span>
          <span>{dark ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
      </div>

      <section className="mx-auto mt-[22px] w-full max-w-[680px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
        <header className="flex items-center gap-[14px] border-b border-[#e6eaf0] px-6 py-5 dark:border-[#253044]">
          <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]">
            <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.4 7.4 0 0 1 8 3.5c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">Selecciona repositorios</span>
            <span className="mt-0.5 block text-[13px] text-[#8c98ac] dark:text-[#a7b4c8]">
              Cuenta @{user?.username} · {state.repositories.length} repositorios
            </span>
          </span>
        </header>

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap gap-[10px]">
            <label className="flex h-[42px] min-w-[220px] flex-1 items-center gap-3 rounded-lg border border-[#d6dce5] px-4 text-[#8c98ac] dark:border-[#35435a] dark:bg-[#0c121d]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="shrink-0">
                <circle cx="11" cy="11" r="6" />
                <path d="m20 20-4.2-4.2" />
              </svg>
              <input
                value={state.query}
                onChange={(event) => dispatch({ type: 'query-changed', query: event.target.value })}
                placeholder="Buscar repositorio"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] dark:text-[#e8edf6]"
              />
            </label>
            <button
              type="button"
              onClick={() => dispatch({
                type: 'visible-repositories-toggled',
                ids: visibleRepositories.map((repository) => repository.id),
              })}
              disabled={state.status !== 'ready' || visibleRepositories.length === 0}
              className="h-[42px] shrink-0 rounded-lg border border-[#d6dce5] bg-white px-4 text-[12.5px] font-semibold whitespace-nowrap text-[#394b6a] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#35435a] dark:bg-[#111826] dark:text-[#c1cbe0]"
            >
              {allVisibleRepositoriesSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-[#e0e6ef] dark:border-[#253044]">
            {state.status === 'loading' ? (
              <p className="px-4 py-8 text-center text-[13px] text-[#8c98ac]">Cargando repositorios...</p>
            ) : state.status === 'error' ? (
              <p className="px-4 py-8 text-center text-[13px] text-[#c2410c] dark:text-[#fb923c]">{state.message}</p>
            ) : visibleRepositories.length > 0 ? (
              visibleRepositories.map((repository) => (
                <RepositoryListItem
                  key={repository.id}
                  repository={repository}
                  selected={state.selectedIds.has(repository.id)}
                  onSelectionChange={(id) => dispatch({ type: 'repository-toggled', id })}
                />
              ))
            ) : (
              <p className="px-4 py-8 text-center text-[13px] text-[#8c98ac]">No encontramos repositorios.</p>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6eaf0] bg-[#f8fafc] px-6 py-4 sm:flex-nowrap dark:border-[#253044] dark:bg-[#0c121d]">
          <span className={`text-[12.5px] ${state.message ? 'text-[#2257c4] dark:text-[#5b8df5]' : 'text-[#8c98ac] dark:text-[#7a8699]'}`}>
            {state.message ?? 'Selecciona al menos un repositorio.'}
          </span>
          <span className="ml-0 flex gap-[10px] sm:ml-auto">
            <button
              type="button"
              onClick={() => dispatch({ type: 'selection-cleared' })}
              className="h-10 rounded-lg border border-[#d6dce5] bg-white px-[18px] text-[13px] font-semibold text-[#51607a] hover:bg-[#f1f5f9] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#c1cbe0]"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'analysis-requested' })}
              disabled={state.selectedIds.size === 0}
              className="h-10 rounded-lg bg-[#2257c4] px-[18px] text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(34,87,196,0.35)] enabled:hover:bg-[#1c489f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Analizar
            </button>
          </span>
        </footer>
      </section>
    </main>
  )
}
