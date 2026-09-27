export const PORT_RESERVATION_PORT = Symbol('PORT_RESERVATION_PORT');

export interface PortReservationPort {
  reservePort(port: number, ownerId: string): Promise<boolean>;
  restorePort(port: number, ownerId: string): Promise<boolean>;
  releasePort(ownerId: string): Promise<boolean>;
}
