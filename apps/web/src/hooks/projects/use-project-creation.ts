import { useCallback } from 'react';
import { useProjects } from '@neoglito/web/hooks/projects/use-projects';
import { useProjectCreationStatus } from '@neoglito/web/hooks/projects/use-project-selectors';
import { useSelectedRepositories } from '@neoglito/web/hooks/repositories/use-repository-selectors';
import { repositoryService } from "@neoglito/web/services/repository.service";
import { useDeploysDispatch } from '@neoglito/web/state/deploys/deploys.context';
import { useProjectsDispatch, useProjectsState } from '@neoglito/web/state/projects/projects.context';
import { useRepositoriesDispatch } from '@neoglito/web/state/repositories/repositories.context';
import { projectService } from "@neoglito/web/services/project.service";
import { shortName } from "@neoglito/web/utils/repository-name";
import {
  getDockerFileCandidatesByRepositoryId,
  getDockerFilePathsByRepositoryId,
} from "@neoglito/web/utils/deploys/compose.helpers";

export function useProjectCreation() {
  const { refresh: loadProjects } = useProjects();
  const { newName, newDescription } = useProjectsState();
  const projectsDispatch = useProjectsDispatch();
  const deploysDispatch = useDeploysDispatch();
  const repositoriesDispatch = useRepositoriesDispatch();
  const selectedRepositories = useSelectedRepositories();
  const { canCreateProject } = useProjectCreationStatus();

  const handleClearSelection = useCallback(() => {
    projectsDispatch({ type: 'panel-error-set', message: null });
    repositoriesDispatch({ type: 'selection-cleared' });
    projectsDispatch({ type: 'creation-cancelled' });
  }, [projectsDispatch, repositoriesDispatch]);

  const handleNewProject = useCallback(() => {
    if (selectedRepositories.length > 0) {
      projectsDispatch({ type: 'panel-error-set', message: null });
      projectsDispatch({ type: 'creation-opened' });
    }
  }, [projectsDispatch, selectedRepositories.length]);

  const handleCreateProject = useCallback(async () => {
    if (!canCreateProject) return;

    const setError = (message: string) =>
      projectsDispatch({ type: 'panel-error-set', message });

    projectsDispatch({ type: 'panel-error-set', message: null });

    const name = newName.trim();
    const description = newDescription.trim();
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
      setError(
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
        setError(
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
      setError(
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
    newDescription,
    newName,
    projectsDispatch,
    repositoriesDispatch,
    selectedRepositories,
  ]);

  return { handleClearSelection, handleCreateProject, handleNewProject };
}
