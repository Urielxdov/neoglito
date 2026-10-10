import { portService } from '@neoglito/web/features/ports/port.service';
import { ownerReservationKey } from '@neoglito/web/features/ports/port-reservations';

export type PortReservationState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'reserved'; ownerKey: string }
  | { status: 'failed'; message: string };

interface PortReservationAttempt {
  projectId: number;
  port: number;
  delayMs: number;
  isBlocked(): boolean;
  publish(state: PortReservationState): void;
  refreshPorts(): Promise<unknown>;
}

/** Cancelling discards stale responses and releases any acquired reservation. */
export function schedulePortReservation({
  projectId,
  port,
  delayMs,
  isBlocked,
  publish,
  refreshPorts,
}: PortReservationAttempt): () => void {
  let cancelled = false;
  let reserved = false;
  const release = async () => {
    try {
      await portService.release(projectId, port);
      await refreshPorts();
    } catch {
      // The draft reservation also expires on the server if it is unreachable.
    }
  };
  const update = (state: PortReservationState) => {
    if (!cancelled) publish(state);
  };

  const timer = setTimeout(async () => {
    if (isBlocked()) return;
    update({ status: 'pending' });
    try {
      const response = await portService.reserve({ projectId, port });
      if (!response.success || !response.data) {
        update({
          status: 'failed',
          message:
            response.error?.message ?? `No se pudo validar el puerto ${port}`,
        });
        return;
      }
      reserved = true;
      if (cancelled) {
        await release();
        return;
      }
      // Confirm the updated list before the hook checks for an expired lease.
      await refreshPorts();
      update({
        status: 'reserved',
        ownerKey: ownerReservationKey(response.data.ownerId),
      });
    } catch (error) {
      update({
        status: 'failed',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo validar el puerto',
      });
    }
  }, delayMs);

  return () => {
    if (cancelled) return;
    cancelled = true;
    clearTimeout(timer);
    if (reserved) void release();
  };
}
