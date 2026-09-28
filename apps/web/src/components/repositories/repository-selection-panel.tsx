import { GitBranch, Search } from 'lucide';
import type { Repository } from "@neoglito/web/models/repository";
import type { RepositoriesState } from "@neoglito/web/state/repositories/repositories.reducer";
import { AppIcon } from "@neoglito/web/components/ui/app-icon";
import { RepositoryListItem } from "@neoglito/web/components/repositories/repository-list-item";

interface RepositorySelectionPanelProps {
  allVisibleRepositoriesSelected: boolean;
  projectCountByRepositoryId: Map<number, number>;
  repositoriesState: RepositoriesState;
  userName?: string;
  visibleRepositories: Repository[];
  onClearSelection(): void;
  onNewProject(): void;
  onQueryChange(query: string): void;
  onRepositoryToggle(id: number): void;
  onVisibleRepositoriesToggle(): void;
}

export function RepositorySelectionPanel({
  allVisibleRepositoriesSelected,
  projectCountByRepositoryId,
  repositoriesState,
  userName,
  visibleRepositories,
  onClearSelection,
  onNewProject,
  onQueryChange,
  onRepositoryToggle,
  onVisibleRepositoriesToggle,
}: RepositorySelectionPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
      <header className="flex shrink-0 items-center gap-[14px] border-b border-[#e6eaf0] px-6 py-5 dark:border-[#253044]">
        <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]">
          <AppIcon icon={GitBranch} size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">
            Selecciona repositorios
          </span>
          <span className="mt-0.5 block text-[13px] text-[#8c98ac] dark:text-[#a7b4c8]">
            Cuenta @{userName} · {repositoriesState.repositories.length}{' '}
            repositorios
          </span>
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-7">
        <div className="flex shrink-0 flex-wrap gap-[10px]">
          <label className="flex h-[42px] min-w-[220px] flex-1 items-center gap-3 rounded-lg border border-[#d6dce5] px-4 text-[#8c98ac] dark:border-[#35435a] dark:bg-[#0c121d]">
            <AppIcon
              icon={Search}
              size={16}
              strokeWidth={1.8}
              className="shrink-0"
            />
            <input
              value={repositoriesState.query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar repositorio"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] dark:text-[#e8edf6]"
            />
          </label>
          <button
            type="button"
            onClick={onVisibleRepositoriesToggle}
            disabled={
              repositoriesState.status !== 'ready' ||
              visibleRepositories.length === 0
            }
            className="h-[42px] shrink-0 rounded-lg border border-[#d6dce5] bg-white px-4 text-[12.5px] font-semibold whitespace-nowrap text-[#394b6a] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#35435a] dark:bg-[#111826] dark:text-[#c1cbe0]"
          >
            {allVisibleRepositoriesSelected
              ? 'Deseleccionar todos'
              : 'Seleccionar todos'}
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border border-[#e0e6ef] dark:border-[#253044]">
          {repositoriesState.status === 'loading' ? (
            <p className="px-4 py-8 text-center text-[13px] text-[#8c98ac]">
              Cargando repositorios...
            </p>
          ) : repositoriesState.status === 'error' ? (
            <p className="px-4 py-8 text-center text-[13px] text-[#c2410c] dark:text-[#fb923c]">
              {repositoriesState.message}
            </p>
          ) : visibleRepositories.length > 0 ? (
            visibleRepositories.map((repository) => (
              <RepositoryListItem
                key={repository.id}
                repository={repository}
                selected={repositoriesState.selectedIds.has(repository.id)}
                projectCount={
                  projectCountByRepositoryId.get(repository.id) ?? 0
                }
                onSelectionChange={onRepositoryToggle}
              />
            ))
          ) : (
            <p className="px-4 py-8 text-center text-[13px] text-[#8c98ac]">
              {repositoriesState.query
                ? `Ningún repositorio coincide con "${repositoriesState.query}".`
                : 'No encontramos repositorios.'}
            </p>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[#e6eaf0] bg-[#f8fafc] px-6 py-4 sm:flex-nowrap dark:border-[#253044] dark:bg-[#0c121d]">
        <span className="text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]">
          {repositoriesState.selectedIds.size === 0
            ? 'Selecciona al menos un repositorio.'
            : `${repositoriesState.selectedIds.size} seleccionado${repositoriesState.selectedIds.size === 1 ? '' : 's'}`}
        </span>
        <span className="ml-0 flex gap-[10px] sm:ml-auto">
          <button
            type="button"
            onClick={onClearSelection}
            className="h-10 rounded-lg border border-[#d6dce5] bg-white px-[18px] text-[13px] font-semibold text-[#51607a] hover:bg-[#f1f5f9] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#c1cbe0]"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={onNewProject}
            disabled={repositoriesState.selectedIds.size === 0}
            className="h-10 rounded-lg bg-[#2257c4] px-[18px] text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(34,87,196,0.35)] enabled:hover:bg-[#1c489f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Nuevo Proyecto
          </button>
        </span>
      </footer>
    </section>
  );
}
