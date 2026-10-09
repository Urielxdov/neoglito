export interface DeploymentPortsResponse {
  deploymentId: string;
  projectId: number;
  status: string;
  sourceComposePath: string | null;
  projectDirectory: string | null;
  services: Array<{
    containerId: string;
    composeServiceName: string;
    port: number | null;
  }>;
}
