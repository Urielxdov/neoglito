import type { ProjectResponse } from '../api/contracts'
import type { Project } from '../models/project'

export function toProject(project: ProjectResponse): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
    repositories: project.repositories,
  }
}
