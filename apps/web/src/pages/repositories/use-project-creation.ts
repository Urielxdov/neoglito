import { useCallback } from 'react';
import type { Dispatch } from 'react';
import type { Repository } from '../../models/repository';
import { repositoryService } from '../../services/repository.service';
import type {
  ProjectsAction,
  ProjectsState,
} from '../../state/projects/projects.reducer';
import type { RepositoriesAction } from '../../state/repositories/repositories.reducer';
import { projectService } from '../../services/project.service';
import { shortName } from '../../utils/repository-name';
import { getDockerFilePathsByRepositoryId } from './repository-selection.helpers';

interface UseProjectCreationOptions {
  canCreateProject: boolean;
  loadProjects(): Promise<void>;
  projectsDispatch: Dispatch<ProjectsAction>;
  projectsState: ProjectsState;
  repositoriesDispatch: Dispatch<RepositoriesAction>;
  selectedRepositories: Repository[];
}

export function useProjectCreation({
  canCreateProject,
  loadProjects,
  projectsDispatch,
  projectsState,
  repositoriesDispatch,
  selectedRepositories,
}: UseProjectCreationOptions) {
  const handleClearSelection = useCallback(() => {
    repositoriesDispatch({ type: 'selection-cleared' });
    projectsDispatch({ type: 'creation-cancelled' });
  }, [projectsDispatch, repositoriesDispatch]);

  const handleNewProject = useCallback(() => {
    if (selectedRepositories.length > 0) {
      projectsDispatch({ type: 'creation-opened' });
    }
  }, [projectsDispatch, selectedRepositories.length]);

  const handleCreateProject = useCallback(async () => {
    if (!canCreateProject) return;

    const name = projectsState.newName.trim();
    const description = projectsState.newDescription.trim();
    const repositoriesToLink = selectedRepositories;
    const total = repositoriesToLink.length + 2;

    projectsDispatch({ type: 'creation-submitting' });
    projectsDispatch({
      type: 'creation-progress',
      done: 0,
      total,
      label: 'Creando proyecto',
    });

    const projectResponse = await projectService.create({ name, description });

    if (!projectResponse.success || !projectResponse.data) {
      projectsDispatch({
        type: 'creation-failed',
        message:
          projectResponse.error?.message ?? 'No fue posible crear el proyecto.',
      });
      return;
    }

    const projectId = projectResponse.data.id;

    for (const [index, repository] of repositoriesToLink.entries()) {
      projectsDispatch({
        type: 'creation-progress',
        done: index + 1,
        total,
        label: `Vinculando ${shortName(repository.name)}`,
      });

      const linkResponse = await repositoryService.create({
        projectId,
        id: repository.id,
        name: repository.name,
        gitUrl: repository.gitUrl,
        cloneUrl: repository.cloneUrl,
      });

      if (!linkResponse.success) {
        projectsDispatch({
          type: 'creation-failed',
          message: `El proyecto se creó, pero no fue posible vincular ${repository.name}: ${linkResponse.error?.message ?? 'error desconocido'}`,
        });
        await loadProjects();
        return;
      }
    }

    projectsDispatch({
      type: 'creation-progress',
      done: repositoriesToLink.length + 1,
      total,
      label: 'Buscando docker-compose',
    });

    const initResponse = await projectService.init({ projectId });

    if (!initResponse.success || !initResponse.data) {
      projectsDispatch({
        type: 'creation-failed',
        message:
          initResponse.error?.message ??
          'El proyecto se creó, pero no fue posible inicializar el despliegue.',
      });
      await loadProjects();
      return;
    }

    projectsDispatch({
      type: 'deploy-paths-discovered',
      projectId,
      pathsByRepositoryId: getDockerFilePathsByRepositoryId(
        repositoriesToLink,
        initResponse.data.clonedRepositoryPaths,
        initResponse.data.dockerComposePaths,
      ),
    });
    projectsDispatch({ type: 'creation-succeeded', projectId });
    repositoriesDispatch({ type: 'selection-cleared' });
    await loadProjects();
  }, [
    canCreateProject,
    loadProjects,
    projectsDispatch,
    projectsState.newDescription,
    projectsState.newName,
    repositoriesDispatch,
    selectedRepositories,
  ]);

  return {
    handleClearSelection,
    handleCreateProject,
    handleNewProject,
  };
}
