import type { PortReservationsResponse } from '@neoglito/web/api/contracts';

const OWNER_PREFIX = 'port-reservation:owner:';
const DEPLOYMENT_OWNER = /^deployment:([^:]+):port:\d+$/;
const DRAFT_OWNER = /^draft:(\d+):port:\d+$/;

/** Clave con la que aparece un propietario en GET /port. */
export function ownerReservationKey(ownerId: string): string {
  return `${OWNER_PREFIX}${ownerId}`;
}

/** Devuelve el puerto si el texto es un puerto individual válido ("5173"); null si no. */
export function parseSinglePort(value: string | null): number | null {
  const text = (value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;

  const port = Number(text);
  return port >= 1 && port <= 65535 ? port : null;
}

export interface PortReservation {
  port: number;
  owner: string;
}

export type PortCheck =
  | { status: 'empty' }
  | { status: 'invalid' }
  | { status: 'free' }
  | { status: 'reserved'; conflicts: PortReservation[] };

function describeOwner(ownerKey: string): string {
  const ownerId = ownerKey.startsWith(OWNER_PREFIX)
    ? ownerKey.slice(OWNER_PREFIX.length)
    : ownerKey;
  const deployment = DEPLOYMENT_OWNER.exec(ownerId);
  if (deployment) return `el despliegue ${deployment[1].slice(0, 8)}`;

  const draft = DRAFT_OWNER.exec(ownerId);
  if (draft) return `un formulario abierto del proyecto ${draft[1]}`;

  return ownerId;
}

export function parseReservations(
  reservations: PortReservationsResponse,
): PortReservation[] {
  return Object.entries(reservations).flatMap(([ownerKey, portKey]) => {
    const port = Number(portKey.split(':').pop());
    return Number.isInteger(port)
      ? [{ port, owner: describeOwner(ownerKey) }]
      : [];
  });
}

/**
 * Valida un puerto publicado ("5173") o un rango ("8000-8002") contra las
 * reservas de Neoglito. No consulta el sistema operativo.
 */
export function checkPublishedPort(
  value: string | null,
  reservations: PortReservation[],
): PortCheck {
  const text = (value ?? '').trim();
  if (!text) return { status: 'empty' };

  const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(text);
  if (!match) return { status: 'invalid' };

  const start = Number(match[1]);
  const end = match[2] === undefined ? start : Number(match[2]);
  if (start < 1 || end > 65535 || start > end) return { status: 'invalid' };

  const conflicts = reservations.filter(
    ({ port }) => port >= start && port <= end,
  );

  return conflicts.length > 0
    ? { status: 'reserved', conflicts }
    : { status: 'free' };
}
