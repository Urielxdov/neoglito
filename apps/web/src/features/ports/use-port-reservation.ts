import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  portsQueryKey,
  usePorts,
} from '@neoglito/web/features/ports/use-ports';
import { parseSinglePort } from '@neoglito/web/features/ports/port-reservations';
import { schedulePortReservation } from '@neoglito/web/features/ports/port-reservation-attempt';
import type { PortReservationState } from '@neoglito/web/features/ports/port-reservation-attempt';
export type { PortReservationState } from '@neoglito/web/features/ports/port-reservation-attempt';

const DEBOUNCE_MS = 600;

/**
 * Reserva en el servidor el puerto individual escrito en un campo.
 * - Valida el primer valor inmediatamente; espera 600 ms tras editarlo.
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
  const firstKeyRef = useRef<string | null>(null);
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
    const wasBlocked = blockedRef.current;
    blockedRef.current = blocked;
    // If reservations finished loading after the timer fired, retry now.
    // A reservation already held by this field must not be released merely
    // because it appears in GET /port.
    if (wasBlocked && !blocked && state.status === 'idle') {
      setAttempt((n) => n + 1);
    }
  }, [blocked, state.status]);

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
    firstKeyRef.current ??= key;

    const cancel = schedulePortReservation({
      projectId,
      port,
      delayMs: key === firstKeyRef.current ? 0 : DEBOUNCE_MS,
      isBlocked: () => blockedRef.current,
      publish: (next) => setResult({ key, state: next }),
      refreshPorts: () =>
        queryClient.invalidateQueries({ queryKey: portsQueryKey }),
    });

    return () => {
      cancel();
      setResult((current) =>
        current.key === key ? { key: null, state: IDLE } : current,
      );
    };
  }, [projectId, port, key, attempt, queryClient]);

  return state;
}
