import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { portsQueryKey, usePorts } from '@neoglito/web/hooks/ports/use-ports';
import { portService } from '@neoglito/web/services/port.service';
import {
  ownerReservationKey,
  parseSinglePort,
} from '@neoglito/web/utils/ports/port-reservations';

const DEBOUNCE_MS = 600;

export type PortReservationState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'reserved'; ownerKey: string }
  | { status: 'failed'; message: string };

/**
 * Reserva en el servidor el puerto individual escrito en un campo.
 * - Espera a que el usuario deje de escribir antes de reservar.
 * - Si el valor cambia, se borra o el campo se desmonta, libera la reserva.
 * - Si la reserva expira en el servidor, la vuelve a pedir.
 * - No intenta reservar si `blocked` (otro propietario ya tiene el puerto).
 */
const IDLE: PortReservationState = { status: 'idle' };

export function usePortReservation(
  projectId: number,
  value: string | null,
  blocked: boolean,
): PortReservationState {
  const queryClient = useQueryClient();
  const { reservedPorts, isFetching, isError } = usePorts();
  const [attempt, setAttempt] = useState(0);
  const blockedRef = useRef(blocked);
  const port = parseSinglePort(value);

  // El resultado se guarda junto a la clave del puerto al que pertenece; si el
  // campo cambia de puerto, el resultado anterior deja de aplicar solo.
  const key = port === null ? null : `${projectId}:${port}`;
  const [result, setResult] = useState<{
    key: string | null;
    state: PortReservationState;
  }>({ key: null, state: IDLE });
  const state = result.key === key ? result.state : IDLE;

  useEffect(() => {
    blockedRef.current = blocked;
  }, [blocked]);

  if (
    state.status === 'reserved' &&
    !isFetching &&
    !isError &&
    !(state.ownerKey in reservedPorts)
  ) {
    // La reserva expiró en el servidor: se descarta y se vuelve a pedir.
    setResult({ key: null, state: IDLE });
    setAttempt((n) => n + 1);
  }

  useEffect(() => {
    if (port === null || key === null) return;

    let cancelled = false;
    let reserved = false;
    const publish = (next: PortReservationState) => {
      if (!cancelled) setResult({ key, state: next });
    };
    const refreshPorts = () =>
      queryClient.invalidateQueries({ queryKey: portsQueryKey });
    const release = () =>
      portService.release(projectId, port).then(refreshPorts);

    const timer = setTimeout(async () => {
      if (blockedRef.current) return;

      publish({ status: 'pending' });
      const response = await portService.reserve({ projectId, port });
      if (!response.success || !response.data) {
        publish({
          status: 'failed',
          message:
            response.error?.message ?? `No se pudo reservar el puerto ${port}`,
        });
        return;
      }

      reserved = true;
      if (cancelled) {
        void release();
        return;
      }

      // Se espera a que la lista de reservas incluya la nueva para no
      // confundirla con una reserva expirada.
      await refreshPorts();
      publish({
        status: 'reserved',
        ownerKey: ownerReservationKey(response.data.ownerId),
      });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (reserved) void release();
      setResult((current) =>
        current.key === key ? { key: null, state: IDLE } : current,
      );
    };
  }, [projectId, port, key, attempt, queryClient]);

  return state;
}
