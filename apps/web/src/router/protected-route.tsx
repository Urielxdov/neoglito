import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from "@neoglito/web/hooks/auth/use-auth"

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <main className="grid min-h-screen place-items-center">Comprobando sesion...</main>
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/authentication" replace state={{ from: location }} />
  }

  return <Outlet />
}
