import type { DeploymentPortsResponse } from '@neoglito/web/shared/api/contracts';
import type { DeployComposePort } from '@neoglito/web/features/deploys/deploys.reducer';
import { deploymentService } from '@neoglito/web/features/projects/deployment.service';

export const deploymentPortsQueryKey = (projectId: number) =>
  ['deployment-ports', projectId] as const;

export async function loadProjectDeploymentPorts(projectId: number) {
  const response = await deploymentService.listByProject(projectId);
  if (!response.success || !response.data) {
    throw new Error(
      response.error?.message ?? 'No se pudieron consultar los despliegues.',
    );
  }
  // El listado viene del más reciente al más antiguo.
  return Promise.all(
    response.data
      .filter((deployment) =>
        ['building', 'starting', 'running'].includes(deployment.status),
      )
      .map(async (deployment) => {
        const ports = await deploymentService.getPorts(deployment.id);
        if (!ports.success || !ports.data) {
          throw new Error(
            ports.error?.message ??
              'No se pudieron consultar los puertos del despliegue.',
          );
        }
        return ports.data;
      }),
  );
}

const normalize = (path: string) => path.replace(/\\/g, '/').replace(/\/$/, '');
const directory = (path: string) =>
  normalize(path).slice(0, normalize(path).lastIndexOf('/'));

export function assignedDeploymentPort(
  port: DeployComposePort,
  ports: readonly DeployComposePort[],
  candidates: readonly string[],
  deployments: readonly DeploymentPortsResponse[],
): string | null {
  // El modelo actual guarda un puerto TCP por servicio. No se replica ese
  // valor sobre otros mappings del mismo servicio ni sobre puertos UDP.
  if (
    port.protocol !== 'tcp' ||
    port.mappingType !== 'one-to-one' ||
    ports.filter(
      (entry) =>
        entry.service === port.service &&
        entry.protocol === 'tcp' &&
        normalize(entry.dockerComposePath) ===
          normalize(port.dockerComposePath),
    ).length !== 1
  )
    return null;

  const path = normalize(port.dockerComposePath);
  const deployment = deployments.find((entry) => {
    if (!['building', 'starting', 'running'].includes(entry.status))
      return false;
    if (entry.sourceComposePath)
      return normalize(entry.sourceComposePath) === path;
    // Compatibilidad con archivos generados antes de guardar la ruta original.
    // Solo se infiere el archivo si hay un único candidato en ese directorio.
    return (
      entry.projectDirectory !== null &&
      normalize(entry.projectDirectory) === directory(path) &&
      new Set(
        candidates
          .filter((candidate) => directory(candidate) === directory(path))
          .map(normalize),
      ).size === 1 &&
      candidates.some((candidate) => normalize(candidate) === path)
    );
  });
  if (!deployment) return null;
  const assigned = new Set(
    deployment.services
      .filter(
        (service) =>
          service.composeServiceName === port.service &&
          service.port !== null &&
          service.port > 0,
      )
      .map((service) => service.port),
  );
  return assigned.size === 1 ? String([...assigned][0]) : null;
}
