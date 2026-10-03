/** Cuerpo de POST /port: reserva provisional de un puerto individual. */
export interface ReservePortRequest {
  projectId: number
  port: number
}
