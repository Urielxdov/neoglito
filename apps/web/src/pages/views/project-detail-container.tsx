import { ProjectDetailPanel } from '@neoglito/web/features/projects/components/detail/project-detail-panel';
import { useProjectAnalysis } from '@neoglito/web/features/projects/hooks/use-project-analysis';
import { useActiveProjectRepositories } from '@neoglito/web/features/projects/hooks/use-project-selectors';
import type { Project } from '@neoglito/web/features/projects/project.model';
import type { ProjectsDetailTab } from '@neoglito/web/features/projects/projects.reducer';
import { useNavigate } from 'react-router-dom';
import { useDeploysDispatch } from '@neoglito/web/features/deploys/deploys.context';
import { useProjectsDispatch } from '@neoglito/web/features/projects/projects.context';

export function ProjectDetailContainer({
  project,
  detailTab,
  composeReady,
}: {
  project: Project;
  detailTab: ProjectsDetailTab;
  composeReady: boolean;
}) {
  const navigate = useNavigate();
  const projectsDispatch = useProjectsDispatch();
  const deploysDispatch = useDeploysDispatch();
  const repositories = useActiveProjectRepositories();
  const { startAnalysis } = useProjectAnalysis();

  return (
    <ProjectDetailPanel
      project={project}
      repositories={repositories}
      detailTab={detailTab}
      composeReady={composeReady}
      onTabChange={(tab) => {
        projectsDispatch({ type: 'edit-reset' });
        navigate(`/projects/${project.id}/${tab}`);
      }}
      onBack={() => {
        projectsDispatch({ type: 'edit-reset' });
        deploysDispatch({ type: 'deploy-row-closed' });
        navigate('/projects');
      }}
      onAnalyze={() => {
        if (composeReady) startAnalysis();
      }}
    />
  );
}
