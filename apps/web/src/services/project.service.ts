import type {
  ApiResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  InitProjectRequest,
  InitProjectResponse,
  ProjectComposeFilesRequest,
  ProjectDockerFilesResponse,
  ProjectResponse,
  UpdateProjectRequest,
} from '../api/contracts'
import { apiClient } from '../api/client'

export const projectService = {
  getAll(): Promise<ApiResponse<ProjectResponse[]>> {
    return apiClient.get<ProjectResponse[]>('/project')
  },

  create(request: CreateProjectRequest): Promise<ApiResponse<CreateProjectResponse>> {
    return apiClient.post<CreateProjectResponse>('/project/registry', request)
  },

  init(request: InitProjectRequest): Promise<ApiResponse<InitProjectResponse>> {
    return apiClient.post<InitProjectResponse>('/project/init', request)
  },

  dockerFilesPath(request: ProjectComposeFilesRequest): Promise<ApiResponse<ProjectDockerFilesResponse>> {
    return apiClient.post<ProjectDockerFilesResponse>('/deployment/docker_files', request)
  },

  /**
   * DEUDA TÉCNICA: es idéntico a `dockerFilesPath` (mismo endpoint y mismo tipo de respuesta).
   * Su nombre es engañoso: no devuelve solo variables de entorno, sino el
   * `ProjectDockerFilesResponse` completo (rutas, compose, variables y puertos).
   * Hoy lo consume `use-project-open`. Pendiente: migrar ese hook a `dockerFilesPath`
   * y eliminar este método.
   */
  environmentVariables(request: ProjectComposeFilesRequest): Promise<ApiResponse<ProjectDockerFilesResponse>> {
    return apiClient.post<ProjectDockerFilesResponse>('/deployment/docker_files', request)
  },

  update(id: number, request: UpdateProjectRequest): Promise<ApiResponse<ProjectResponse>> {
    return apiClient.post<ProjectResponse>(`/project/${id}/update`, request)
  },
}
