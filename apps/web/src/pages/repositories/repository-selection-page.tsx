import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { ProjectDetailModal } from '../../components/repositories/project-detail-modal';
import { ProjectsPanel } from '../../components/repositories/projects-panel';
import { RepositorySelectionPanel } from '../../components/repositories/repository-selection-panel';
import { projectService } from '../../services/project.service';
import { repositoryService } from '../../services/repository.service';
import { useAuth } from '../../state/auth/auth-context';
import {
  initialProjectsState,
  projectsReducer,
} from '../../state/projects/projects.reducer';
import {
  initialRepositoriesState,
  repositoriesReducer,
} from '../../state/repositories/repositories.reducer';
import {
  getProjectCountByRepositoryId,
  getProjectDeployRepositories,
  getProjectDetailRepositories,
  getVisibleRepositories,
  isProjectNameTaken,
} from './repository-selection.helpers';
import { useProjectCreation } from './use-project-creation';

export default function RepositorySelectionPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [repositoriesState, repositoriesDispatch] = useReducer(
    repositoriesReducer,
    initialRepositoriesState,
  );
  const [projectsState, projectsDispatch] = useReducer(
    projectsReducer,
    initialProjectsState,
  );

  const dark = theme === 'dark';

  useEffect(() => {
    const loadRepositories = async () => {
      const response = await repositoryService.getAll();

      if (response.success && response.data) {
        repositoriesDispatch({
          type: 'load-succeeded',
          repositories: response.data,
        });
        return;
      }

      repositoriesDispatch({
        type: 'load-failed',
        message:
          response.error?.message ?? 'No fue posible cargar los repositorios.',
      });
    };

    void loadRepositories();
  }, []);

  const loadProjects = useCallback(async () => {
    const response = await projectService.getAll();

    if (response.success && response.data) {
      projectsDispatch({ type: 'load-succeeded', projects: response.data });
      return;
    }

    projectsDispatch({
      type: 'load-failed',
      message:
        response.error?.message ?? 'No fue posible cargar los proyectos.',
    });
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const visibleRepositories = useMemo(
    () =>
      getVisibleRepositories(
        repositoriesState.repositories,
        repositoriesState.query,
      ),
    [repositoriesState.query, repositoriesState.repositories],
  );

  const projectCountByRepositoryId = useMemo(
    () => getProjectCountByRepositoryId(projectsState.projects),
    [projectsState.projects],
  );

  const selectedRepositories = useMemo(
    () =>
      repositoriesState.repositories.filter((repository) =>
        repositoriesState.selectedIds.has(repository.id),
      ),
    [repositoriesState.repositories, repositoriesState.selectedIds],
  );

  const allVisibleRepositoriesSelected =
    visibleRepositories.length > 0 &&
    visibleRepositories.every((repository) =>
      repositoriesState.selectedIds.has(repository.id),
    );

  const nameTaken = isProjectNameTaken(
    projectsState.projects,
    projectsState.newName,
  );

  const canCreateProject =
    projectsState.newName.trim().length > 0 &&
    projectsState.newDescription.trim().length > 0 &&
    !nameTaken &&
    selectedRepositories.length > 0 &&
    !projectsState.submitting;

  const { handleClearSelection, handleCreateProject, handleNewProject } =
    useProjectCreation({
      canCreateProject,
      loadProjects,
      projectsDispatch,
      projectsState,
      repositoriesDispatch,
      selectedRepositories,
    });

  const openProject =
    projectsState.projects.find(
      (project) => project.id === projectsState.openId,
    ) ?? null;
  const activeProject =
    projectsState.projects.find(
      (project) => project.id === projectsState.activeId,
    ) ?? null;

  const openProjectRepositories = useMemo(
    () =>
      getProjectDetailRepositories(
        openProject,
        repositoriesState.repositories,
        projectCountByRepositoryId,
      ),
    [openProject, projectCountByRepositoryId, repositoriesState.repositories],
  );

  const activeProjectRepositories = useMemo(
    () =>
      getProjectDeployRepositories(
        activeProject,
        repositoriesState.repositories,
      ),
    [activeProject, repositoriesState.repositories],
  );

  return (
    <main
      data-theme={theme}
      className="min-h-screen bg-[#f8fafc] px-6 pb-20 pt-14 font-sans text-[#16202e] dark:bg-[#0c121d] dark:text-[#e8edf6]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4">
        <span className="text-[13px] font-semibold uppercase tracking-[0.09em] text-[#8c98ac] dark:text-[#7a8699]">
          Repositorios y proyectos
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

      <div className="mx-auto mt-[22px] grid w-full max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-[22px]">
        <RepositorySelectionPanel
          allVisibleRepositoriesSelected={allVisibleRepositoriesSelected}
          projectCountByRepositoryId={projectCountByRepositoryId}
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

        <ProjectsPanel
          activeProject={activeProject}
          activeProjectRepositories={activeProjectRepositories}
          canCreateProject={canCreateProject}
          nameTaken={nameTaken}
          projectsDispatch={projectsDispatch}
          projectsState={projectsState}
          selectedRepositories={selectedRepositories}
          onCreateProject={() => void handleCreateProject()}
        />
      </div>

      {openProject && (
        <ProjectDetailModal
          project={openProject}
          repositories={openProjectRepositories}
          onClose={() => projectsDispatch({ type: 'project-closed' })}
          onViewDeploy={() =>
            projectsDispatch({ type: 'detail-opened', id: openProject.id })
          }
        />
      )}
    </main>
  );
}
