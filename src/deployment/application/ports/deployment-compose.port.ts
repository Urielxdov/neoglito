import type { DeployComposeRequest } from '@neoglito/shared/repository';
import { basename } from 'node:path';

export const DEPLOYMENT_COMPOSE_PORT = Symbol('DEPLOYMENT_COMPOSE_PORT');
export type DeploymentComposeConfiguration = Pick<
  DeployComposeRequest,
  'environment' | 'ports' | 'mirrorPorts'
>;

/** Credencial con la que los servicios del deployment envían telemetría al collector. */
export interface DeploymentTelemetryConfiguration {
  token: string;
  projectId?: number;
}

export interface PreparedDeploymentCompose {
  composePath: string;
  projectName: string;
  publishedPorts: number[];
}

export interface DeploymentComposePort {
  readSource(
    composePath: string,
    deploymentId: string,
  ): Promise<{
    sourceComposePath: string | null;
    projectDirectory: string | null;
  }>;
  prepare(
    sourcePath: string,
    deploymentId: string,
    configuration: DeploymentComposeConfiguration,
    telemetry?: DeploymentTelemetryConfiguration,
  ): Promise<PreparedDeploymentCompose>;
}

export function deploymentComposeProjectName(deploymentId: string): string {
  return `neoglito-${deploymentId}`;
}

/** Conserva el comportamiento de los despliegues anteriores al archivo propio. */
export function deploymentRuntimeProjectName(
  deploymentId: string,
  composePath: string,
): string | undefined {
  return basename(composePath) ===
    `.${deploymentComposeProjectName(deploymentId)}.compose.yml`
    ? deploymentComposeProjectName(deploymentId)
    : undefined;
}
