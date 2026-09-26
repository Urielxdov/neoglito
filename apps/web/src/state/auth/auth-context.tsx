import { createContext, useContext, useEffect, useReducer } from 'react'
import type { PropsWithChildren } from 'react'
import { authService } from "@neoglito/web/services/auth.service"
import {
  authReducer,
  initialAuthState,
  type AuthState,
} from "@neoglito/web/state/auth/auth.reducer"

interface AuthContextValue extends AuthState {
  refresh(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState)

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
