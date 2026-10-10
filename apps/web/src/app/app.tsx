import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@neoglito/web/features/auth/auth-context';
import { AppRoutes } from '@neoglito/web/app/app-routes';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
