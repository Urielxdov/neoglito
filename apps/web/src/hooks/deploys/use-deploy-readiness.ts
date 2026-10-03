import type { Project } from '@neoglito/web/models/project';
import { useDeploysState } from '@neoglito/web/state/deploys/deploys.context';
import { getMissingRequiredEnvCount } from '@neoglito/web/utils/deploys/compose.helpers';

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
