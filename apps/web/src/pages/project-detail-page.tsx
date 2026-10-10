import { Navigate, useParams } from 'react-router-dom';
import { ProjectDetailContainer } from '@neoglito/web/pages/views/project-detail-container';
import { useRouteProject } from '@neoglito/web/features/projects/hooks/use-route-project';
import { useProjectCompose } from '@neoglito/web/features/projects/hooks/use-project-compose';
import type { ProjectsDetailTab } from '@neoglito/web/features/projects/projects.reducer';

const tabs: ProjectsDetailTab[] = ['deploy', 'routes', 'repos', 'general'];

export default function ProjectDetailPage() {
  const project = useRouteProject();
  const { tab = 'deploy' } = useParams();
  const compose = useProjectCompose(project);
  if (!tabs.includes(tab as ProjectsDetailTab)) {
    return <Navigate to={`/projects/${project.id}/deploy`} replace />;
  }
  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col gap-4">
      {compose.isLoading && <p role="status">Buscando archivos Compose...</p>}
      {compose.isError && (
        <div role="alert">
          <p>{compose.error?.message}</p>
          <button type="button" onClick={() => void compose.refetch()}>
            Reintentar
          </button>
        </div>
      )}
      <ProjectDetailContainer
        project={project}
        detailTab={tab as ProjectsDetailTab}
        composeReady={compose.isSuccess}
      />
    </div>
  );
}
