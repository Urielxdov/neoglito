import type { ProjectResponse } from '@neoglito/web/shared/api/contracts'
import type { Project } from '@neoglito/web/features/projects/project.model'

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
