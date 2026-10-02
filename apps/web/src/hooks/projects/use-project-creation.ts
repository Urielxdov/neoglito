import { useCallback, useState } from 'react';
import type { Dispatch } from 'react';
import type { Repository } from "@neoglito/web/models/repository";
import { repositoryService } from "@neoglito/web/services/repository.service";
import type {
  ProjectsAction,
  ProjectsState,
} from "@neoglito/web/state/projects/projects.reducer";
import type { DeploysAction } from "@neoglito/web/state/deploys/deploys.reducer";
import type { RepositoriesAction } from "@neoglito/web/state/repositories/repositories.reducer";
import { projectService } from "@neoglito/web/services/project.service";
import { shortName } from "@neoglito/web/utils/repository-name";
import {
  getDockerFileCandidatesByRepositoryId,
  getDockerFilePathsByRepositoryId,
} from "@neoglito/web/pages/repositories/repository-selection.helpers";

interface UseProjectCreationOptions {
  canCreateProject: boolean;
  deploysDispatch: Dispatch<DeploysAction>;
  loadProjects(): Promise<void>;
  projectsDispatch: Dispatch<ProjectsAction>;
  projectsState: ProjectsState;
  repositoriesDispatch: Dispatch<RepositoriesAction>;
  selectedRepositories: Repository[];
}

export function useProjectCreation({
  canCreateProject,
  deploysDispatch,
  loadProjects,
  projectsDispatch,
  projectsState,
  repositoriesDispatch,
  selectedRepositories,
}: UseProjectCreationOptions) {
  const [creationError, setCreationError] = useState<string | null>(null);

  const handleClearSelection = useCallback(() => {
    setCreationError(null);
    repositoriesDispatch({ type: 'selection-cleared' });
    projectsDispatch({ type: 'creation-cancelled' });
  }, [projectsDispatch, repositoriesDispatch]);

  const handleNewProject = useCallback(() => {
    if (selectedRepositories.length > 0) {
      setCreationError(null);
      projectsDispatch({ type: 'creation-opened' });
    }
  }, [projectsDispatch, selectedRepositories.length]);

  const handleCreateProject = useCallback(async () => {
    if (!canCreateProject) return;

    setCreationError(null);

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
      setCreationError(
        projectResponse.error?.message ?? 'No fue posible crear el proyecto.',
      );
      projectsDispatch({
        type: 'creation-failed',
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
        setCreationError(
          `El proyecto se creó, pero no fue posible vincular ${repository.name}: ${linkResponse.error?.message ?? 'error desconocido'}`,
        );
        projectsDispatch({
          type: 'creation-failed',
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
      setCreationError(
        initResponse.error?.message ??
          'El proyecto se creó, pero no fue posible inicializar el despliegue.',
      );
      projectsDispatch({
        type: 'creation-failed',
      });
      await loadProjects();
      return;
    }

    deploysDispatch({
      type: 'deploy-paths-discovered',
      projectId,
      pathsByRepositoryId: getDockerFilePathsByRepositoryId(
        repositoriesToLink,
        initResponse.data.clonedRepositoryPaths,
        initResponse.data.dockerComposePaths,
      ),
      candidatesByRepositoryId: getDockerFileCandidatesByRepositoryId(
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
    deploysDispatch,
    loadProjects,
    projectsDispatch,
    projectsState.newDescription,
    projectsState.newName,
    repositoriesDispatch,
    selectedRepositories,
  ]);

  return {
    creationError,
    handleClearSelection,
    handleCreateProject,
    handleNewProject,
  };
}
