import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthenticationPage from "@neoglito/web/pages/authentication/authentication-page"
import RepositorySelectionPage from "@neoglito/web/pages/repositories/repository-selection-page"
import { ProtectedRoute } from "@neoglito/web/router/protected-route"
import { AuthProvider } from "@neoglito/web/state/auth/auth-context"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route index element={<RepositorySelectionPage />} />
            <Route path="authentication" element={<AuthenticationPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
