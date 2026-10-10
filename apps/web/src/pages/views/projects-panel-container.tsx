import { ProjectsPanel } from '@neoglito/web/features/projects/components/list/projects-panel';
import { useProjectCreation } from '@neoglito/web/features/projects/hooks/use-project-creation';
import { useNavigate } from 'react-router-dom';
import { useProjectCreationStatus } from '@neoglito/web/features/projects/hooks/use-project-selectors';
import { useProjects } from '@neoglito/web/features/projects/hooks/use-projects';
import { useSelectedRepositories } from '@neoglito/web/features/repositories/use-repository-selectors';
import {
  useProjectsDispatch,
  useProjectsState,
} from '@neoglito/web/features/projects/projects.context';
import { shortName } from '@neoglito/web/features/repositories/repository-name';

export function ProjectsPanelContainer() {
  const { allProjects, isLoading, isError, error } = useProjects();
  const projectsState = useProjectsState();
  const projectsDispatch = useProjectsDispatch();
  const selectedRepositories = useSelectedRepositories();
  const { nameTaken, canCreateProject } = useProjectCreationStatus();
  const { handleCreateProject } = useProjectCreation();
  const navigate = useNavigate();

  const projectsError = isError
    ? (error ?? 'No fue posible cargar los proyectos.')
    : projectsState.panelError;

  return (
    <ProjectsPanel
      projects={allProjects}
      projectsLoading={isLoading}
      projectsError={projectsError}
      creating={projectsState.creating}
      newName={projectsState.newName}
      newDescription={projectsState.newDescription}
      nameTaken={nameTaken}
      selectedRepositoryNames={selectedRepositories.map((repository) =>
        shortName(repository.name),
      )}
      canCreateProject={canCreateProject}
      submitting={projectsState.submitting}
      creationProgress={projectsState.progress}
      onNameChange={(name) => projectsDispatch({ type: 'name-changed', name })}
      onDescriptionChange={(description) =>
        projectsDispatch({ type: 'description-changed', description })
      }
      onCancelCreation={() => projectsDispatch({ type: 'creation-cancelled' })}
      onCreateProject={() => void handleCreateProject()}
      onOpenProject={(id) => navigate(`/projects/${id}/deploy`)}
    />
  );
}
