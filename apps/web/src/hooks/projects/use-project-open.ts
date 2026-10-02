import { useCallback, useState } from 'react';
import type { Dispatch } from 'react';
import type { Project } from '@neoglito/web/models/project';
import type { Repository } from '@neoglito/web/models/repository';
import { projectService } from '@neoglito/web/services/project.service';
import type { DeploysAction } from '@neoglito/web/state/deploys/deploys.reducer';
import type { ProjectsAction } from '@neoglito/web/state/projects/projects.reducer';
import {
  getComposePortsByRepositoryId,
  getDockerFileCandidatesByRepositoryId,
  getDockerFilePathsByRepositoryId,
  getEnvironmentVariablesByRepositoryId,
} from '@neoglito/web/pages/repositories/repository-selection.helpers';

interface UseProjectOpenOptions {
  allProjects: Project[];
  allRepositories: Repository[];
  deploysDispatch: Dispatch<DeploysAction>;
  projectsDispatch: Dispatch<ProjectsAction>;
}

export function useProjectOpen({
  allProjects,
  allRepositories,
  deploysDispatch,
  projectsDispatch,
}: UseProjectOpenOptions) {
  const [deployError, setDeployError] = useState<string | null>(null);

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
        setDeployError(
          response.error?.message ??
            'No fue posible buscar los archivos Docker del proyecto.',
        );
        return;
      }

      setDeployError(null);

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

  return { deployError, handleOpenProject };
}
