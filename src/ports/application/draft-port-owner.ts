/** Tiempo que vive una reserva hecha desde el formulario antes de expirar sola. */
export const DRAFT_PORT_TTL_SECONDS = 5 * 60;

/**
 * Propietario de una reserva provisional hecha desde el formulario de despliegue,
 * antes de que exista el despliegue. Al desplegar se libera y el puerto pasa al
 * propietario `deployment:<id>:port:<n>`.
 */
export function draftPortOwnerId(projectId: number, port: number): string {
  return `draft:${projectId}:port:${port}`;
}
