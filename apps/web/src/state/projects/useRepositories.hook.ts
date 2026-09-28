import { useQuery } from '@tanstack/react-query'
import { toRepository } from '../../mappers/repository.mapper'
import { repositoryService } from '../../services/repository.service'

export function useRepositories() {
  const query = useQuery({
    queryKey: ['repositories'],
    queryFn: async () => {
      const response = await repositoryService.getAll()

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'No fue posible cargar los repositorios.')
      }

      return response.data.map(toRepository)
    },
  })

  return {
    allRepositories: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message ?? null,
  }
}