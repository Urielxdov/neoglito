import type { Project } from '@neoglito/web/features/projects/project.model';
import { useDeploysState } from '@neoglito/web/features/deploys/deploys.context';
import { getMissingRequiredEnvCount } from '@neoglito/web/features/projects/compose.helpers';

export function useDeployReadiness(
  project: Project,
  repositories: Array<{ id: number }>,
) {
  const { deployPaths, deployEnv } = useDeploysState();

  const total = repositories.length;
  const readyCount = repositories.filter((repository) => {
    const key = `${project.id}:${repository.id}`;
    const path = (deployPaths[key] ?? '').trim();
    return (
      path.length > 0 && getMissingRequiredEnvCount(deployEnv[key] ?? []) === 0
    );
  }).length;

  return { total, readyCount, allReady: total > 0 && readyCount === total };
}
