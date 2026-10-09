import type { DeployComposeRequest } from '@neoglito/web/shared/api/contracts';
import type {
  DeployComposePort,
  DeployEnvVar,
} from '@neoglito/web/features/deploys/deploys.reducer';

const samePath = (left: string, right: string) =>
  left.replace(/\\/g, '/') === right.replace(/\\/g, '/');

export function createDeploymentRequest(
  projectId: number,
  composePath: string,
  environment: DeployEnvVar[],
  ports: DeployComposePort[],
): DeployComposeRequest {
  const selectedEnvironment = environment.filter(
    (row) =>
      !row.dockerComposePath || samePath(row.dockerComposePath, composePath),
  );
  const missing = selectedEnvironment.filter(
    (row) => row.required && !row.value.trim(),
  );
  if (missing.length > 0) {
    throw new Error(
      `Completa las variables requeridas: ${missing.map((row) => `${row.service ? `${row.service}:` : ''}${row.key}`).join(', ')}`,
    );
  }
  return {
    projectId,
    composePath,
    mirrorPorts: true,
    environment: selectedEnvironment
      .filter((row) => row.key.trim().length > 0)
      .map((row) => ({
        ...(row.service ? { service: row.service } : {}),
        key: row.key.trim(),
        value: row.value,
      })),
    ports: ports
      .filter((port) => samePath(port.dockerComposePath, composePath))
      .map((port) => ({
        service: port.service,
        hostIp: port.hostIp,
        targetPort: port.targetPort,
        protocol: port.protocol,
        mappingType: port.mappingType,
        publishedPort: port.publishedPort?.trim() || null,
      })),
  };
}
