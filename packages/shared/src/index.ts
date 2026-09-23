export type IsoDateString = string

export interface ApiResponse<T> {
    success: boolean
    data: T | null
    error: ApiError | null
    meta: ApiMeta | null
}

export interface ApiError {
    code: string
    message: string
    details?: unknown
}

export interface ApiMeta {
    page?: number
    limit?: number
    total?: number
}

export interface CreateProjectRequest {
    name: string
    description: string
}

export interface CreateProjectResponse {
    id: number
    name: string
    description: string
    createdAt: IsoDateString
    updatedAt: IsoDateString
}

export interface CreateRepositoryRequest {
    projectId: number
    cloneUrl: string
    sshPrivateKey: string
    technology: string
}

export interface CreateRepositoryResponse {
    id: number
    projectId: number
    cloneUrl: string
    technology: string | null
    createdAt: IsoDateString
    updatedAt: IsoDateString
}

export interface CloneRepositoryRequest {
    projectId: number
    cloneUrl: string
    sshPrivateKey: string
    technology?: string
}

export interface CloneRepositoryResponse {
    pathSystem: string
}
