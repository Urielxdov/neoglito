import { createContext, useContext, useEffect, useReducer } from 'react'
import type { PropsWithChildren } from 'react'
import type { AuthenticatedUserResponse } from "@neoglito/web/api/contracts"
import { authService } from "@neoglito/web/services/auth.service"

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  user: AuthenticatedUserResponse | null
}

type AuthAction =
  | { type: 'authenticated'; user: AuthenticatedUserResponse }
  | { type: 'unauthenticated' }

interface AuthContextValue extends AuthState {
  refresh(): Promise<void>
}

const initialState: AuthState = {
  status: 'loading',
  user: null,
}

const AuthContext = createContext<AuthContextValue | null>(null)

function authReducer(_state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'authenticated':
      return { status: 'authenticated', user: action.user }
    case 'unauthenticated':
      return { status: 'unauthenticated', user: null }
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const refresh = async () => {
    const response = await authService.getCurrentUser()

    if (response.success && response.data) {
      dispatch({ type: 'authenticated', user: response.data })
      return
    }

    dispatch({ type: 'unauthenticated' })
  }

  useEffect(() => {
    void refresh()
  }, [])

  return <AuthContext value={{ ...state, refresh }}>{children}</AuthContext>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  return context
}
