import { ProjectDetailPanel } from '@neoglito/web/features/projects/components/detail/project-detail-panel';
import { useProjectAnalysis } from '@neoglito/web/features/projects/hooks/use-project-analysis';
import { useActiveProjectRepositories } from '@neoglito/web/features/projects/hooks/use-project-selectors';
import type { Project } from '@neoglito/web/features/projects/project.model';
import { useDeploysDispatch } from '@neoglito/web/features/deploys/deploys.context';
import {
  useProjectsDispatch,
  useProjectsState,
} from '@neoglito/web/features/projects/projects.context';

export function ProjectDetailContainer({ project }: { project: Project }) {
  const { detailTab } = useProjectsState();
  const projectsDispatch = useProjectsDispatch();
  const deploysDispatch = useDeploysDispatch();
  const repositories = useActiveProjectRepositories();
  const { startAnalysis } = useProjectAnalysis();

  return (
    <ProjectDetailPanel
      project={project}
      repositories={repositories}
      detailTab={detailTab}
      onTabChange={(tab) =>
        projectsDispatch({ type: 'detail-tab-changed', tab })
      }
      onBack={() => {
        projectsDispatch({ type: 'detail-closed' });
        deploysDispatch({ type: 'deploy-row-closed' });
      }}
      onAnalyze={startAnalysis}
    />
  );
}
