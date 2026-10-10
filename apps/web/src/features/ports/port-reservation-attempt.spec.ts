import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { PortReservationState } from './port-reservation-attempt';
import { portService } from './port.service';
import { schedulePortReservation } from './port-reservation-attempt';

vi.mock('./port.service', () => ({
  portService: { reserve: vi.fn(), release: vi.fn() },
}));

describe('Port availability checks', () => {
  const success = {
    success: true,
    data: { port: 3000, ownerId: 'draft:7:port:3000' },
    error: null,
    meta: null,
  };
  let publish: Mock<(state: PortReservationState) => void>;
  let refreshPorts: Mock<() => Promise<unknown>>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(portService.reserve).mockReset().mockResolvedValue(success);
    vi.mocked(portService.release)
      .mockReset()
      .mockResolvedValue({
        success: true,
        data: { released: true },
        error: null,
        meta: null,
      });
    publish = vi.fn();
    refreshPorts = vi.fn().mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  function start(port = 3000, delayMs = 0, isBlocked = () => false) {
    return schedulePortReservation({
      projectId: 7,
      port,
      delayMs,
      isBlocked,
      publish,
      refreshPorts,
    });
  }

  it('checks an initial port without the typing delay and reports server confirmation', async () => {
    const cancel = start();
    await vi.advanceTimersByTimeAsync(0);
    expect(portService.reserve).toHaveBeenCalledWith({
      projectId: 7,
      port: 3000,
    });
    expect(publish.mock.calls.map(([state]) => state.status)).toEqual([
      'pending',
      'reserved',
    ]);
    expect(refreshPorts).toHaveBeenCalled();
    cancel();
  });

  it('debounces edits and checks only the final value', async () => {
    const cancelFirstEdit = start(4000, 600);
    await vi.advanceTimersByTimeAsync(300);
    cancelFirstEdit();
    const cancelLastEdit = start(4001, 600);
    await vi.advanceTimersByTimeAsync(599);
    expect(portService.reserve).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(portService.reserve).toHaveBeenCalledExactlyOnceWith({
      projectId: 7,
      port: 4001,
    });
    cancelLastEdit();
  });

  it('shows a failed check for a port occupied on the server', async () => {
    vi.mocked(portService.reserve).mockResolvedValue({
      success: false,
      data: null,
      error: { code: 'CONFLICT', message: 'El puerto 3000 no está disponible' },
      meta: null,
    });
    start();
    await vi.advanceTimersByTimeAsync(0);
    expect(publish).toHaveBeenLastCalledWith({
      status: 'failed',
      message: 'El puerto 3000 no está disponible',
    });
    expect(portService.release).not.toHaveBeenCalled();
  });

  it('discards an old response after editing or unmounting and releases its reservation', async () => {
    let resolveReserve!: (response: typeof success) => void;
    vi.mocked(portService.reserve).mockReturnValue(
      new Promise((resolve) => {
        resolveReserve = resolve;
      }),
    );
    const cancel = start();
    await vi.advanceTimersByTimeAsync(0);
    cancel();
    resolveReserve(success);
    await vi.advanceTimersByTimeAsync(0);
    expect(publish.mock.calls.map(([state]) => state.status)).toEqual([
      'pending',
    ]);
    expect(portService.release).toHaveBeenCalledExactlyOnceWith(7, 3000);
  });

  it('releases a confirmed reservation when its field is removed', async () => {
    const cancel = start();
    await vi.advanceTimersByTimeAsync(0);
    cancel();
    cancel();
    expect(portService.release).toHaveBeenCalledExactlyOnceWith(7, 3000);
  });

  it('waits for reservation data before contacting the server', async () => {
    start(3000, 0, () => true);
    await vi.advanceTimersByTimeAsync(0);
    expect(portService.reserve).not.toHaveBeenCalled();
    const cancel = start(3000, 0, () => false);
    await vi.advanceTimersByTimeAsync(0);
    expect(publish).toHaveBeenLastCalledWith({
      status: 'reserved',
      ownerKey: 'port-reservation:owner:draft:7:port:3000',
    });
    cancel();
  });
});
