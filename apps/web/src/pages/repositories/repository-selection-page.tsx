import { useCallback, useMemo, useReducer } from 'react';
import { ProjectAnalyzeView } from '@neoglito/web/components/repositories/project-analyze-view';
import { ProjectDetailModal } from '@neoglito/web/components/repositories/project-detail-modal';
import { ProjectsPanel } from '@neoglito/web/components/repositories/projects-panel';
import { RepositorySelectionPanel } from '@neoglito/web/components/repositories/repository-selection-panel';
import { projectService } from '@neoglito/web/services/project.service';
import { useAuth } from '@neoglito/web/hooks/auth/use-auth';
import {
  initialProjectsState,
  projectsReducer,
} from '@neoglito/web/state/projects/projects.reducer';
import { useProjects } from '@neoglito/web/hooks/projects/use-projects';
import {
  initialRepositoriesState,
  repositoriesReducer,
} from '@neoglito/web/state/repositories/repositories.reducer';
import { useRepositories } from '@neoglito/web/hooks/repositories/use-repositories';
import {
  getProjectCountByRepositoryId,
  getProjectDeployRepositories,
  getProjectDetailRepositories,
  getVisibleRepositories,
  isProjectNameTaken,
} from '@neoglito/web/pages/repositories/repository-selection.helpers';
import { useProjectAnalysis } from '@neoglito/web/hooks/projects/use-project-analysis';
import { useProjectCreation } from '@neoglito/web/hooks/projects/use-project-creation';
import { useProjectOpen } from '@neoglito/web/hooks/projects/use-project-open';

export default function RepositorySelectionPage() {
  const { user } = useAuth();
  const {
    allRepositories,
    isLoading: repositoriesLoading,
    isError: repositoriesError,
    error: repositoriesErrorMessage,
  } = useRepositories();
  const {
    allProjects,
    isLoading: projectsLoading,
    isError: projectsError,
    error: projectsErrorMessage,
    refresh: loadProjects,
  } = useProjects();
  const [repositoriesState, repositoriesDispatch] = useReducer(
    repositoriesReducer,
    initialRepositoriesState,
  );
  const [projectsState, projectsDispatch] = useReducer(
    projectsReducer,
    initialProjectsState,
  );

  const visibleRepositories = useMemo(
    () => getVisibleRepositories(allRepositories, repositoriesState.query),
    [allRepositories, repositoriesState.query],
  );

  const projectCountByRepositoryId = useMemo(
    () => getProjectCountByRepositoryId(allProjects),
    [allProjects],
  );

  const selectedRepositories = useMemo(
    () =>
      allRepositories.filter((repository) =>
        repositoriesState.selectedIds.has(repository.id),
      ),
    [allRepositories, repositoriesState.selectedIds],
  );

  const allVisibleRepositoriesSelected =
    visibleRepositories.length > 0 &&
    visibleRepositories.every((repository) =>
      repositoriesState.selectedIds.has(repository.id),
    );

  const nameTaken = isProjectNameTaken(allProjects, projectsState.newName);

  const canCreateProject =
    projectsState.newName.trim().length > 0 &&
    projectsState.newDescription.trim().length > 0 &&
    !nameTaken &&
    selectedRepositories.length > 0 &&
    !projectsState.submitting;

  const {
    creationError,
    handleClearSelection,
    handleCreateProject,
    handleNewProject,
  } = useProjectCreation({
    canCreateProject,
    loadProjects,
    projectsDispatch,
    projectsState,
    repositoriesDispatch,
    selectedRepositories,
  });

  const { deployError: projectOpenError, handleOpenProject } = useProjectOpen({
    allProjects,
    allRepositories,
    projectsDispatch,
  });

  const projectsPanelError = projectsError
    ? (projectsErrorMessage ?? 'No fue posible cargar los proyectos.')
    : (creationError ?? projectOpenError);

  const { startAnalysis } = useProjectAnalysis({ projectsDispatch });

  const openProject =
    allProjects.find((project) => project.id === projectsState.openId) ?? null;

  const activeProject =
    allProjects.find((project) => project.id === projectsState.activeId) ??
    null;

  const openProjectRepositories = useMemo(
    () =>
      getProjectDetailRepositories(
        openProject,
        allRepositories,
        projectCountByRepositoryId,
      ),
    [openProject, projectCountByRepositoryId, allRepositories],
  );

  const activeProjectRepositories = useMemo(
    () => getProjectDeployRepositories(activeProject, allRepositories),
    [activeProject, allRepositories],
  );

  const editName = projectsState.editName ?? activeProject?.name ?? '';
  const editDescription =
    projectsState.editDescription ?? activeProject?.description ?? '';
  const editNameTaken = isProjectNameTaken(
    allProjects,
    editName,
    activeProject?.id,
  );
  const editClean = activeProject
    ? editName === activeProject.name &&
      editDescription === activeProject.description
    : true;

  const handleSaveGeneral = useCallback(async () => {
    if (
      !activeProject ||
      editClean ||
      editNameTaken ||
      !editName.trim() ||
      !editDescription.trim()
    ) {
      return;
    }

    projectsDispatch({ type: 'edit-submitting' });

    const response = await projectService.update(activeProject.id, {
      name: editName.trim(),
      description: editDescription.trim(),
    });

    if (!response.success || !response.data) {
      projectsDispatch({
        type: 'edit-failed',
        message:
          response.error?.message ?? 'No fue posible guardar los cambios.',
      });
      return;
    }

    projectsDispatch({ type: 'edit-succeeded' });
    await loadProjects();
  }, [
    activeProject,
    editClean,
    editDescription,
    editName,
    editNameTaken,
    loadProjects,
  ]);

  const handleAnalyze = useCallback(() => {
    if (!activeProject) return;

    startAnalysis(
      activeProject,
      activeProjectRepositories,
      projectsState.deployPaths,
    );
  }, [
    activeProject,
    activeProjectRepositories,
    projectsState.deployPaths,
    startAnalysis,
  ]);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-6 pb-6 font-sans text-[#16202e] dark:text-[#e8edf6]">
      {projectsState.phase === 'analyze' &&
      activeProject &&
      projectsState.analyze ? (
        <ProjectAnalyzeView
          project={activeProject}
          repositories={activeProjectRepositories}
          analyze={projectsState.analyze}
          onBack={() => projectsDispatch({ type: 'analyze-closed' })}
          onToggleGroup={(id) =>
            projectsDispatch({
              type: 'analyze-group-toggled',
              repositoryId: id,
            })
          }
          onSelectService={(key) =>
            projectsDispatch({ type: 'analyze-service-selected', key })
          }
          onTabChange={(tab) =>
            projectsDispatch({ type: 'analyze-tab-changed', tab })
          }
        />
      ) : projectsState.phase === 'detail' ? (
        <div className="mx-auto mt-[22px] min-h-0 w-full max-w-[960px] flex-1">
          <ProjectsPanel
            activeProject={activeProject}
            activeProjectRepositories={activeProjectRepositories}
            canCreateProject={canCreateProject}
            projects={allProjects}
            projectsLoading={projectsLoading}
            projectsError={projectsPanelError}
            nameTaken={nameTaken}
            projectsDispatch={projectsDispatch}
            projectsState={projectsState}
            selectedRepositories={selectedRepositories}
            editName={editName}
            editDescription={editDescription}
            editNameTaken={editNameTaken}
            editClean={editClean}
            onCreateProject={() => void handleCreateProject()}
            onOpenProject={(id) => void handleOpenProject(id)}
            onAnalyze={handleAnalyze}
            onEditSave={() => void handleSaveGeneral()}
          />
        </div>
      ) : (
        <div className="mt-[22px] grid min-h-0 w-full flex-1 grid-cols-1 gap-[22px] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <RepositorySelectionPanel
            allVisibleRepositoriesSelected={allVisibleRepositoriesSelected}
            projectCountByRepositoryId={projectCountByRepositoryId}
            repositories={allRepositories}
            repositoriesLoading={repositoriesLoading}
            repositoriesError={
              repositoriesError
                ? (repositoriesErrorMessage ??
                  'No fue posible cargar los repositorios.')
                : null
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

          <ProjectsPanel
            activeProject={activeProject}
            activeProjectRepositories={activeProjectRepositories}
            canCreateProject={canCreateProject}
            projects={allProjects}
            projectsLoading={projectsLoading}
            projectsError={projectsPanelError}
            nameTaken={nameTaken}
            projectsDispatch={projectsDispatch}
            projectsState={projectsState}
            selectedRepositories={selectedRepositories}
            editName={editName}
            editDescription={editDescription}
            editNameTaken={editNameTaken}
            editClean={editClean}
            onCreateProject={() => void handleCreateProject()}
            onOpenProject={(id) => void handleOpenProject(id)}
            onAnalyze={handleAnalyze}
            onEditSave={() => void handleSaveGeneral()}
          />
        </div>
      )}

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
