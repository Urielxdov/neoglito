import type { Project } from '@neoglito/web/features/projects/project.model';
import { useDeploysState } from '@neoglito/web/features/deploys/deploys.context';
import { getMissingRequiredEnvCount } from '@neoglito/web/features/projects/compose.helpers';
import { usePorts } from '@neoglito/web/features/ports/use-ports';
import {
  checkPublishedPort,
  parseReservations,
} from '@neoglito/web/features/ports/port-reservations';

export function useDeployReadiness(
  project: Project,
  repositories: Array<{ id: number }>,
) {
  const { deployPaths, deployEnv, deployPorts } = useDeploysState();
  const { reservedPorts = {}, isLoading, isError } = usePorts();
  const reservations = parseReservations(reservedPorts);

  const total = repositories.length;
  const readyCount = repositories.filter((repository) => {
    const key = `${project.id}:${repository.id}`;
    const path = (deployPaths[key] ?? '').trim();
    return (
      path.length > 0 &&
      getMissingRequiredEnvCount(deployEnv[key] ?? []) === 0 &&
      !isLoading &&
      !isError &&
      (deployPorts[key] ?? [])
        .filter(
          (port) =>
            port.dockerComposePath.replace(/\\/g, '/') ===
            path.replace(/\\/g, '/'),
        )
        .every((port) => {
          if (!port.publishedPort) return true;
          const draftOwner = `port-reservation:owner:draft:${project.id}:port:${port.publishedPort.trim()}`;
          return (
            checkPublishedPort(
              port.publishedPort,
              reservations.filter((entry) => entry.ownerKey !== draftOwner),
            ).status === 'free'
          );
        })
    );
  }).length;

  return { total, readyCount, allReady: total > 0 && readyCount === total };
}
