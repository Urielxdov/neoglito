import type { ProjectResponse } from '../../api/contracts'
import type { Project } from '../../models/project'

export type ProjectsStatus = 'loading' | 'ready' | 'error'

export interface ProjectsState {
  status: ProjectsStatus
  projects: Project[]
  creating: boolean
  submitting: boolean
  newName: string
  newDescription: string
  openId: number | null
  message: string | null
}

export type ProjectsAction =
  | { type: 'load-succeeded'; projects: ProjectResponse[] }
  | { type: 'load-failed'; message: string }
  | { type: 'creation-opened' }
  | { type: 'creation-cancelled' }
  | { type: 'name-changed'; name: string }
  | { type: 'description-changed'; description: string }
  | { type: 'creation-submitting' }
  | { type: 'creation-failed'; message: string }
  | { type: 'creation-succeeded' }
  | { type: 'project-opened'; id: number }
  | { type: 'project-closed' }

export const initialProjectsState: ProjectsState = {
  status: 'loading',
  projects: [],
  creating: false,
  submitting: false,
  newName: '',
  newDescription: '',
  openId: null,
  message: null,
}

function toProject(project: ProjectResponse): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
    repositories: project.repositories,
  }
}

export function projectsReducer(state: ProjectsState, action: ProjectsAction): ProjectsState {
  switch (action.type) {
    case 'load-succeeded':
      return {
        ...state,
        status: 'ready',
        projects: action.projects.map(toProject),
      }
    case 'load-failed':
      return { ...state, status: 'error', message: action.message }
    case 'creation-opened':
      return { ...state, creating: true, message: null }
    case 'creation-cancelled':
      return { ...state, creating: false, newName: '', newDescription: '', message: null }
    case 'name-changed':
      return { ...state, newName: action.name }
    case 'description-changed':
      return { ...state, newDescription: action.description }
    case 'creation-submitting':
      return { ...state, submitting: true, message: null }
    case 'creation-failed':
      return { ...state, submitting: false, message: action.message }
    case 'creation-succeeded':
      return {
        ...state,
        submitting: false,
        creating: false,
        newName: '',
        newDescription: '',
        message: null,
      }
    case 'project-opened':
      return { ...state, openId: action.id }
    case 'project-closed':
      return { ...state, openId: null }
  }
}
