import type { ApiError, ApiResponse } from './contracts'

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return typeof value === 'object'
    && value !== null
    && 'success' in value
    && 'data' in value
    && 'error' in value
    && 'meta' in value
}

function responseError(code: string, message: string, details?: unknown): ApiResponse<never> {
  const error: ApiError = { code, message, ...(details === undefined ? {} : { details }) }

  return {
    success: false,
    data: null,
    error,
    meta: null,
  }
}

export const apiClient = {
  async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...options.headers,
        },
      })
      const payload: unknown = await response.json()

      if (isApiResponse<T>(payload)) {
        return payload
      }

      return responseError(
        'INVALID_API_RESPONSE',
        'La API respondió con un formato no soportado',
        payload,
      )
    } catch (error) {
      return responseError(
        'NETWORK_ERROR',
        'No fue posible conectar con la API',
        error instanceof Error ? error.message : error,
      )
    }
  },

  get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path)
  },
}
