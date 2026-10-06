import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthenticationPage from "@neoglito/web/pages/authentication-page"
import RepositorySelectionPage from "@neoglito/web/pages/repository-selection-page"
import { ProtectedRoute } from "@neoglito/web/app/protected-route"
import { AuthProvider } from "@neoglito/web/features/auth/auth-context"
import { AppLayout } from "@neoglito/web/app/app-layout"

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="authentication" element={<AuthenticationPage />} />
            <Route element={<ProtectedRoute />}>
              <Route index element={<RepositorySelectionPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
