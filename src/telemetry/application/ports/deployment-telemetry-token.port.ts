export const DEPLOYMENT_TELEMETRY_TOKEN_PORT = Symbol(
  'DEPLOYMENT_TELEMETRY_TOKEN_PORT',
);

export interface DeploymentTelemetryTokenPort {
  /** Crea (o reemplaza) el token del deployment y lo devuelve en claro una sola vez. */
  issue(deploymentId: string): Promise<string>;
  /** deploymentId asociado a un token vigente; null si no existe o fue revocado. */
  resolve(token: string): Promise<string | null>;
  revoke(deploymentId: string): Promise<void>;
}
