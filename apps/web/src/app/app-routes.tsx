import { Navigate, Route, Routes } from 'react-router-dom';
import AuthenticationPage from '@neoglito/web/pages/authentication-page';
import RepositorySelectionPage from '@neoglito/web/pages/repository-selection-page';
import ProjectsPage from '@neoglito/web/pages/projects-page';
import ProjectLayout from '@neoglito/web/pages/project-layout';
import ProjectDetailPage from '@neoglito/web/pages/project-detail-page';
import ProjectAnalysisPage from '@neoglito/web/pages/project-analysis-page';
import ProjectTelemetryPage from '@neoglito/web/pages/project-telemetry-page';
import { AppLayout } from '@neoglito/web/app/app-layout';
import { ProtectedRoute } from '@neoglito/web/app/protected-route';
import { WorkspaceLayout } from '@neoglito/web/app/workspace-layout';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="authentication" element={<AuthenticationPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<WorkspaceLayout />}>
            <Route index element={<Navigate to="/repositories" replace />} />
            <Route path="repositories" element={<RepositorySelectionPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectLayout />}>
              <Route index element={<Navigate to="deploy" replace />} />
              <Route path="analysis" element={<ProjectAnalysisPage />} />
              <Route
                path="telemetry/:deploymentId"
                element={<ProjectTelemetryPage />}
              />
              <Route path=":tab" element={<ProjectDetailPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
