import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Project } from '@neoglito/web/features/projects/project.model';
import { useRepositories } from '@neoglito/web/features/repositories/use-repositories';
import { projectService } from '@neoglito/web/features/projects/project.service';
import {
  useDeploysDispatch,
  useDeploysState,
} from '@neoglito/web/features/deploys/deploys.context';
import {
  getComposePortsByRepositoryId,
  getDockerFileCandidatesByRepositoryId,
  getDockerFilePathsByRepositoryId,
  getEnvironmentVariablesByRepositoryId,
} from '@neoglito/web/features/projects/compose.helpers';

export function useProjectCompose(project: Project) {
  const { allRepositories } = useRepositories();
  const dispatch = useDeploysDispatch();
  const { deployEnv, deployPorts } = useDeploysState();
  const query = useQuery({
    queryKey: ['project-compose', project.id],
    staleTime: Infinity,
    queryFn: async () => {
      const response = await projectService.dockerFilesPath({
        projectId: project.id,
      });
      if (!response.success || !response.data) {
        throw new Error(
          response.error?.message ??
            'No fue posible buscar los archivos Docker del proyecto.',
        );
      }
      return response.data;
    },
  });
  useEffect(() => {
    if (!query.data) return;
    const repositories = allRepositories.filter(
      (repository) =>
        project.repositories.some((linked) => linked.id === repository.id) &&
        (deployEnv[`${project.id}:${repository.id}`] === undefined ||
          deployPorts[`${project.id}:${repository.id}`] === undefined),
    );
    if (repositories.length === 0) return;
    const { clonedRepositoryPaths, dockerFilesPath, composeAnalyses } =
      query.data;
    const envByRepositoryId = getEnvironmentVariablesByRepositoryId(
      repositories,
      clonedRepositoryPaths,
      composeAnalyses,
    );
    const portsByRepositoryId = getComposePortsByRepositoryId(
      repositories,
      clonedRepositoryPaths,
      composeAnalyses,
    );
    // Empty results also mark a repository as loaded, preventing repeated
    // initialization and preserving drafts when a page is mounted again.
    for (const repository of repositories) {
      envByRepositoryId[repository.id] ??= [];
      portsByRepositoryId[repository.id] ??= [];
    }
    dispatch({
      type: 'deploy-paths-discovered',
      projectId: project.id,
      pathsByRepositoryId: getDockerFilePathsByRepositoryId(
        repositories,
        clonedRepositoryPaths,
        dockerFilesPath,
        composeAnalyses,
      ),
      candidatesByRepositoryId: getDockerFileCandidatesByRepositoryId(
        repositories,
        clonedRepositoryPaths,
        dockerFilesPath,
      ),
    });
    dispatch({
      type: 'deploy-env-discovered',
      projectId: project.id,
      envByRepositoryId,
    });
    dispatch({
      type: 'deploy-ports-discovered',
      projectId: project.id,
      portsByRepositoryId,
    });
  }, [
    allRepositories,
    deployEnv,
    deployPorts,
    dispatch,
    project.id,
    project.repositories,
    query.data,
  ]);
  return query;
}
