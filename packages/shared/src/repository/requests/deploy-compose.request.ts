import type { ComposePort } from '@neoglito/shared/repository/responses/project-docker-files.response';

export interface DeployComposeEnvironmentVariable {
  /** Sin servicio, se aplica a todos los servicios del archivo seleccionado. */
  service?: string;
  key: string;
  value: string;
}

export interface DeployComposeRequest {
  projectId: number;
  composePath: string;
  environment?: DeployComposeEnvironmentVariable[];
  ports?: ComposePort[];
  /** Configura el listener y publica el mismo número en el host y contenedor. */
  mirrorPorts?: boolean;
}
