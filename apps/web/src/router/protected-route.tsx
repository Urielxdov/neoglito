import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { authService } from '../services/auth.service'
import { useAuth } from '../state/auth/auth-context'

export function ProtectedRoute() {
  const { status } = useAuth()

  useEffect(() => {
    if (status === 'unauthenticated') {
      authService.connectWithGitHub()
    }
  }, [status])

  if (status === 'loading') {
    return <main className="grid min-h-screen place-items-center">Comprobando sesión…</main>
  }

  if (status === 'unauthenticated') {
    return <main className="grid min-h-screen place-items-center">Redirigiendo a GitHub…</main>
  }

  return <Outlet />
}
