import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthenticationPage from './pages/authentication/authentication-page'
import RepositorySelectionPage from './pages/repositories/repository-selection-page'
import { ProtectedRoute } from './router/protected-route'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route index element={<RepositorySelectionPage />} />
          <Route path="authentication" element={<AuthenticationPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
