import type {
  ApiResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  CreateRepositoryRequest,
  CreateRepositoryResponse,
} from '../../api/contracts'
import type { Repository } from '../../models/repository'

export interface CreateProjectWithRepositoriesInput {
  projectProperties: CreateProjectRequest
  repositories: Repository[]
}

export interface CreateProjectWithRepositoriesDependencies {
  createProject(input: CreateProjectRequest): Promise<ApiResponse<CreateProjectResponse>>
  createRepository(input: CreateRepositoryRequest): Promise<ApiResponse<CreateRepositoryResponse>>
}

export async function createProjectWithRepositories(
  input: CreateProjectWithRepositoriesInput,
  { createProject, createRepository }: CreateProjectWithRepositoriesDependencies,
) {
  const projectResponse = await createProject(input.projectProperties)

  if (!projectResponse.success || !projectResponse.data) {
    throw new Error(
      'No fue posible obtener un projectId válido para vincular los repositorios.'
    )
  }

  const project = projectResponse.data
  const projectId = project.id

  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error('No fue posible obtener un projectId válido para vincular los repositorios.')
  }

  for (const repository of input.repositories) {
    const response = await createRepository({
      projectId,
      id: repository.id,
      name: repository.name,
      gitUrl: repository.gitUrl,
      cloneUrl: repository.cloneUrl,
    })

    if (!response.success) {
      throw new Error(
        response.error?.message ??
        `No fue posible vincular el repositorio ${repository.name}.`
      )
    }
  }

  return project
}
