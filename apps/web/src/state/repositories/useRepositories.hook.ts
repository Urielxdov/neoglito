import { useMutation, useQuery } from '@tanstack/react-query'
import { toRepository } from '../../mappers/repository.mapper.js'
import { createRepositorySchema } from '../../schemas/create-repository.schema'
import { repositoryService } from '../../services/repository.service.js'
import type { CreateRepositoryRequest } from '@neoglito/shared'

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

  const createRepositoryMutation = useMutation({
    mutationFn: async (input: CreateRepositoryRequest) => {
      const validation = createRepositorySchema.safeParse(input)

      if (!validation.success) {
        throw new Error(validation.error.issues[0]?.message ?? 'Los datos del repositorio no son válidos.')
      }

      return repositoryService.create(validation.data)
    },
  })

  return {
    allRepositories: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message ?? null,
    createRepository: createRepositoryMutation.mutateAsync,
  }
}
