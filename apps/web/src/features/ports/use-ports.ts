import { useQuery } from '@tanstack/react-query'
import type { PortReservationsResponse } from '@neoglito/web/shared/api/contracts'
import { portService } from '@neoglito/web/features/ports/port.service'

export const portsQueryKey = ['ports'] as const

const emptyReservations: PortReservationsResponse = {}

export function usePorts() {
  const query = useQuery({
    queryKey: portsQueryKey,
    queryFn: async () => {
      const response = await portService.getAll()

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'No fue posible cargar las reservas de puertos.')
      }

      return response.data
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: 30_000,
  })

  return {
    reservedPorts: query.data ?? emptyReservations,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error?.message ?? null,
    async refresh() {
      await query.refetch()
    },
  }
}
