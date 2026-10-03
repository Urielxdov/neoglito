import { apiClient } from "@neoglito/web/api/client"
import type {
  ApiResponse,
  PortReservationsResponse,
  ReservePortRequest,
} from "@neoglito/web/api/contracts"

export const portService = {
  /** Obtiene las reservas de puertos, asociando la clave del propietario con la del puerto. */
  getAll(): Promise<ApiResponse<PortReservationsResponse>> {
    return apiClient.get<PortReservationsResponse>('/port')
  },

  /** Reserva provisionalmente un puerto individual; expira solo en el servidor. */
  reserve(
    request: ReservePortRequest,
  ): Promise<ApiResponse<{ port: number; ownerId: string }>> {
    return apiClient.post<{ port: number; ownerId: string }>('/port', request)
  },

  /** Libera una reserva provisional hecha con `reserve`. */
  release(projectId: number, port: number): Promise<ApiResponse<{ released: boolean }>> {
    return apiClient.delete<{ released: boolean }>(`/port/${projectId}/${port}`)
  },
}
