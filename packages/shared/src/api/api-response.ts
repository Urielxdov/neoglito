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
