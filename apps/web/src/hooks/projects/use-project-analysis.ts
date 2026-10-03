import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { portsQueryKey } from '@neoglito/web/hooks/ports/use-ports';
import { useActiveProject, useActiveProjectRepositories } from '@neoglito/web/hooks/projects/use-project-selectors';
import { deploymentService } from "@neoglito/web/services/deployment.service";
import { useDeploysState } from '@neoglito/web/state/deploys/deploys.context';
import { useProjectsDispatch } from '@neoglito/web/state/projects/projects.context';

export function useProjectAnalysis() {
  const queryClient = useQueryClient();
  const projectsDispatch = useProjectsDispatch();
  const { deployPaths } = useDeploysState();
  const project = useActiveProject();
  const repositories = useActiveProjectRepositories();

  const startAnalysis = useCallback(() => {
    if (!project) return;

    const targets = repositories
      .map((repository) => ({
        repository,
        path: (deployPaths[`${project.id}:${repository.id}`] ?? '').trim(),
      }))
      .filter((target) => target.path.length > 0);

    projectsDispatch({
      type: 'analyze-opened',
      projectId: project.id,
      repositoryIds: targets.map((target) => target.repository.id),
    });

    for (const { repository, path } of targets) {
      void deploymentService
        .deploy({ projectId: project.id, composePath: path })
        .then((response) => {
          void queryClient.invalidateQueries({ queryKey: portsQueryKey });
          if (response.success && response.data) {
            projectsDispatch({
              type: 'analyze-repo-succeeded',
              repositoryId: repository.id,
              deployment: response.data,
            });
            return;
          }

          projectsDispatch({
            type: 'analyze-repo-failed',
            repositoryId: repository.id,
            message:
              response.error?.message ??
              'No fue posible desplegar este repositorio.',
          });
        });
    }
  }, [deployPaths, project, projectsDispatch, queryClient, repositories]);

  return { startAnalysis };
}
