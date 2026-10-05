/** Datos de GET /port: relaciona cada propietario con su puerto reservado. */
export interface PortReservationsResponse {
  /** Ejemplo: "port-reservation:owner:container-123": "port-reservation:port:3000". */
  [ownerReservationKey: string]: string
}
