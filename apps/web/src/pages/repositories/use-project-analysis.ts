import { useCallback } from 'react';
import type { Dispatch } from 'react';
import type { ProjectDetailRepositoryInfo } from "@neoglito/web/components/repositories/project-detail-view";
import type { Project } from "@neoglito/web/models/project";
import { deploymentService } from "@neoglito/web/services/deployment.service";
import type { ProjectsAction } from "@neoglito/web/state/projects/projects.reducer";

interface UseProjectAnalysisOptions {
  projectsDispatch: Dispatch<ProjectsAction>;
}

export function useProjectAnalysis({
  projectsDispatch,
}: UseProjectAnalysisOptions) {
  const startAnalysis = useCallback(
    (
      project: Project,
      repositories: ProjectDetailRepositoryInfo[],
      deployPaths: Record<string, string>,
    ) => {
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
    },
    [projectsDispatch],
  );

  return { startAnalysis };
}
