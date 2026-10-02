import type { AuthenticatedUserResponse } from "@neoglito/web/api/contracts"

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthState {
  status: AuthStatus
  user: AuthenticatedUserResponse | null
}

export type AuthAction =
  | { type: 'authenticated'; user: AuthenticatedUserResponse }
  | { type: 'unauthenticated' }

export const initialAuthState: AuthState = {
  status: 'loading',
  user: null,
}

export function authReducer(
  _state: AuthState,
  action: AuthAction,
): AuthState {
  switch (action.type) {
    case 'authenticated':
      return { status: 'authenticated', user: action.user }
    case 'unauthenticated':
      return { status: 'unauthenticated', user: null }
    default: {
      const _exhaustive: never = action
      throw new Error(`Acción desconocida en authReducer: ${_exhaustive}`)
    }
  }
}
