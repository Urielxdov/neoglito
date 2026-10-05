import { RepositorySelectionPanel } from '@neoglito/web/features/repositories/components/repository-selection-panel';
import { useAuth } from '@neoglito/web/features/auth/use-auth';
import { useProjectCreation } from '@neoglito/web/features/projects/hooks/use-project-creation';
import { useRepositories } from '@neoglito/web/features/repositories/use-repositories';
import {
  useAllVisibleRepositoriesSelected,
  useProjectCountByRepositoryId,
  useVisibleRepositories,
} from '@neoglito/web/features/repositories/use-repository-selectors';
import {
  useRepositoriesDispatch,
  useRepositoriesState,
} from '@neoglito/web/features/repositories/repositories.context';

export function RepositorySelectionContainer() {
  const { user } = useAuth();
  const {
    allRepositories,
    isLoading,
    isError,
    error,
  } = useRepositories();
  const repositoriesState = useRepositoriesState();
  const repositoriesDispatch = useRepositoriesDispatch();
  const visibleRepositories = useVisibleRepositories();
  const allVisibleRepositoriesSelected = useAllVisibleRepositoriesSelected();
  const projectCountByRepositoryId = useProjectCountByRepositoryId();
  const { handleClearSelection, handleNewProject } = useProjectCreation();

  return (
    <RepositorySelectionPanel
      allVisibleRepositoriesSelected={allVisibleRepositoriesSelected}
      projectCountByRepositoryId={projectCountByRepositoryId}
      repositories={allRepositories}
      repositoriesLoading={isLoading}
      repositoriesError={
        isError ? (error ?? 'No fue posible cargar los repositorios.') : null
      }
      repositoriesState={repositoriesState}
      userName={user?.username}
      visibleRepositories={visibleRepositories}
      onClearSelection={handleClearSelection}
      onNewProject={handleNewProject}
      onQueryChange={(query) =>
        repositoriesDispatch({ type: 'query-changed', query })
      }
      onRepositoryToggle={(id) =>
        repositoriesDispatch({ type: 'repository-toggled', id })
      }
      onVisibleRepositoriesToggle={() =>
        repositoriesDispatch({
          type: 'visible-repositories-toggled',
          ids: visibleRepositories.map((repository) => repository.id),
        })
      }
    />
  );
}
