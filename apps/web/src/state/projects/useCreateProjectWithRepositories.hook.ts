import { useCallback } from 'react'
import {
  createProjectWithRepositories,
} from '../../use-cases/project/createProjectWithRepositories.use-case'
import type { CreateProjectWithRepositoriesInput } from '../../use-cases/project/createProjectWithRepositories.use-case'
import { useRepositories } from '../repositories/useRepositories.hook'
import { useProjects } from './useProjects.hook'

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
