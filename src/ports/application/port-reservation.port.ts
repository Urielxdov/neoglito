export const PORT_RESERVATION_PORT = Symbol('PORT_RESERVATION_PORT');

export interface HeldPortReservation {
  port: number;
  ownerId: string;
  handoff<T>(operation: () => Promise<T>): Promise<T>;
  handoff(): Promise<void>;
  release(): Promise<boolean>;
}

export interface PortReservationPort {
  getAll(): Promise<Record<string, string>>;
  reservePort(port: number, ownerId: string): Promise<boolean>;
  holdPort(
    port: number,
    ownerId: string,
    timeoutMs?: number,
  ): Promise<HeldPortReservation | null>;
  restorePort(port: number, ownerId: string): Promise<boolean>;
  releasePort(ownerId: string): Promise<boolean>;
}
