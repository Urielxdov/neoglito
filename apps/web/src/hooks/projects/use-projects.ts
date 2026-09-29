import { useMutation, useQuery } from '@tanstack/react-query'
import { toProject } from '@neoglito/web/mappers/project.mapper'
import type { Project } from '@neoglito/web/models/project'
import { createProjectSchema } from '@neoglito/web/schemas/create-project.schema'
import { projectService } from '@neoglito/web/services/project.service'
import type { CreateProjectRequest } from '@neoglito/shared'

const emptyProjects: Project[] = []

export function useProjects() {
  const query = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectService.getAll()

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'No fue posible cargar los proyectos.')
      }

      return response.data.map(toProject)
    },
  })


  const createProjectMutation = useMutation({
    mutationFn: async (input: CreateProjectRequest) => {
      const validation = createProjectSchema.safeParse(input)

      if (!validation.success) {
        throw new Error(validation.error.issues[0]?.message ?? 'Los datos del proyecto no son válidos.')
      }

      return projectService.create(validation.data)
    },
  })

  return {
    allProjects: query.data ?? emptyProjects,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error?.message ?? null,
    async refresh() {
      await query.refetch()
    },
    createProject: createProjectMutation.mutateAsync,
  }
}
