import { useCallback } from 'react';
import { useProjects } from '@neoglito/web/hooks/projects/use-projects';
import { useRepositories } from '@neoglito/web/hooks/repositories/use-repositories';
import { projectService } from '@neoglito/web/services/project.service';
import { useDeploysDispatch } from '@neoglito/web/state/deploys/deploys.context';
import { useProjectsDispatch } from '@neoglito/web/state/projects/projects.context';
import {
  getComposePortsByRepositoryId,
  getDockerFileCandidatesByRepositoryId,
  getDockerFilePathsByRepositoryId,
  getEnvironmentVariablesByRepositoryId,
} from '@neoglito/web/utils/deploys/compose.helpers';

export function useProjectOpen() {
  const { allProjects } = useProjects();
  const { allRepositories } = useRepositories();
  const projectsDispatch = useProjectsDispatch();
  const deploysDispatch = useDeploysDispatch();

  const handleOpenProject = useCallback(
    async (projectId: number) => {
      projectsDispatch({ type: 'project-opened', id: projectId });

      const project = allProjects.find(
        (candidate) => candidate.id === projectId,
      );

      if (!project) {
        return;
      }

      const response = await projectService.environmentVariables({ projectId });

      if (!response.success || !response.data) {
        projectsDispatch({
          type: 'panel-error-set',
          message:
            response.error?.message ??
            'No fue posible buscar los archivos Docker del proyecto.',
        });
        return;
      }

      projectsDispatch({ type: 'panel-error-set', message: null });

      const repositories = allRepositories.filter((repository) =>
        project.repositories.some(
          (projectRepository) => projectRepository.id === repository.id,
        ),
      );

      deploysDispatch({
        type: 'deploy-paths-discovered',
        projectId,
        pathsByRepositoryId: getDockerFilePathsByRepositoryId(
          repositories,
          response.data.clonedRepositoryPaths,
          response.data.dockerFilesPath,
        ),
        candidatesByRepositoryId: getDockerFileCandidatesByRepositoryId(
          repositories,
          response.data.clonedRepositoryPaths,
          response.data.dockerFilesPath,
        ),
      });
      deploysDispatch({
        type: 'deploy-env-discovered',
        projectId,
        envByRepositoryId: getEnvironmentVariablesByRepositoryId(
          repositories,
          response.data.clonedRepositoryPaths,
          response.data.composeAnalyses,
        ),
      });
      deploysDispatch({
        type: 'deploy-ports-discovered',
        projectId,
        portsByRepositoryId: getComposePortsByRepositoryId(
          repositories,
          response.data.clonedRepositoryPaths,
          response.data.composeAnalyses,
        ),
      });
    },
    [allProjects, allRepositories, deploysDispatch, projectsDispatch],
  );

  return { handleOpenProject };
}
