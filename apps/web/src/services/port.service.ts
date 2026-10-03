import { apiClient } from "@neoglito/web/api/client"
import type { ApiResponse, PortReservationsResponse } from "@neoglito/web/api/contracts"

export const portService = {
  /** Obtiene las reservas de puertos, asociando la clave del propietario con la del puerto. */
  getAll(): Promise<ApiResponse<PortReservationsResponse>> {
    return apiClient.get<PortReservationsResponse>('/port')
  },
}
