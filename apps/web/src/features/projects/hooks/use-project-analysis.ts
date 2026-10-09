import { useCallback } from 'react';
import type { DeployComposeRequest } from '@neoglito/web/shared/api/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { portsQueryKey } from '@neoglito/web/features/ports/use-ports';
import {
  useActiveProject,
  useActiveProjectRepositories,
} from '@neoglito/web/features/projects/hooks/use-project-selectors';
import { deploymentService } from '@neoglito/web/features/projects/deployment.service';
import { createDeploymentRequest } from '@neoglito/web/features/projects/deployment-request';
import { deploymentPortsQueryKey } from '@neoglito/web/features/projects/deployment-assigned-ports';
import { useDeploysState } from '@neoglito/web/features/deploys/deploys.context';
import { useAnalysisDispatch } from '@neoglito/web/features/analysis/analysis.context';
import { useProjectsDispatch } from '@neoglito/web/features/projects/projects.context';

export function useProjectAnalysis() {
  const queryClient = useQueryClient();
  const projectsDispatch = useProjectsDispatch();
  const analysisDispatch = useAnalysisDispatch();
  const { deployPaths, deployPorts, deployEnv } = useDeploysState();
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

    projectsDispatch({ type: 'analyze-phase-entered' });
    analysisDispatch({
      type: 'analyze-opened',
      projectId: project.id,
      repositoryIds: targets.map((target) => target.repository.id),
    });

    for (const { repository, path } of targets) {
      const key = `${project.id}:${repository.id}`;
      let request: DeployComposeRequest;
      try {
        request = createDeploymentRequest(
          project.id,
          path,
          deployEnv[key] ?? [],
          deployPorts[key] ?? [],
        );
      } catch (error) {
        analysisDispatch({
          type: 'analyze-repo-failed',
          repositoryId: repository.id,
          message:
            error instanceof Error
              ? error.message
              : 'Configuración de despliegue inválida.',
        });
        continue;
      }
      console.log('[deployment:ui] Analizar: formulario y payload', {
        repositoryId: repository.id,
        formPorts: (deployPorts[key] ?? [])
          .filter(
            (port) =>
              port.dockerComposePath.replace(/\\/g, '/') ===
              path.replace(/\\/g, '/'),
          )
          .map((port) => ({
            service: port.service,
            hostIp: port.hostIp,
            publishedPort: port.publishedPort,
            targetPort: port.targetPort,
            protocol: port.protocol,
          })),
        request: {
          ...request,
          environment: request.environment?.map(({ service, key }) => ({
            service,
            key,
          })),
        },
      });
      void deploymentService
        .deployAndClassify(request)
        .then(({ response, classificationError }) => {
          void queryClient.invalidateQueries({ queryKey: portsQueryKey });
          void queryClient.invalidateQueries({
            queryKey: deploymentPortsQueryKey(project.id),
          });
          if (response.success && response.data) {
            analysisDispatch({
              type: 'analyze-repo-succeeded',
              repositoryId: repository.id,
              deployment: response.data,
              message: classificationError,
            });
            return;
          }

          analysisDispatch({
            type: 'analyze-repo-failed',
            repositoryId: repository.id,
            message:
              response.error?.message ??
              'No fue posible desplegar este repositorio.',
          });
        });
    }
  }, [
    analysisDispatch,
    deployPaths,
    deployPorts,
    deployEnv,
    project,
    projectsDispatch,
    queryClient,
    repositories,
  ]);

  const closeAnalysis = useCallback(() => {
    analysisDispatch({ type: 'analyze-closed' });
    projectsDispatch({ type: 'analyze-phase-left' });
  }, [analysisDispatch, projectsDispatch]);

  return { startAnalysis, closeAnalysis };
}
