import { useCallback } from 'react'
import {
  createProjectWithRepositories,
} from '../../use-cases/project/createProjectWithRepositories.use-case'
import type { CreateProjectWithRepositoriesInput } from '../../use-cases/project/createProjectWithRepositories.use-case'
import { useRepositories } from '@neoglito/web/hooks/repositories/use-repositories'
import { useProjects } from '@neoglito/web/hooks/projects/use-projects'

export function useCreateProjectWithRepositories() {
  const { createProject } = useProjects()
  const { createRepository } = useRepositories()

  const create = useCallback(
    (input: CreateProjectWithRepositoriesInput) => createProjectWithRepositories(input, {
      createProject,
      createRepository,
    }),
    [createProject, createRepository],
  )

  return { createProjectWithRepositories: create }
}
