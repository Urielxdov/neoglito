import { ProjectAnalyzeView } from '@neoglito/web/components/repositories/project-analyze-view';
import { useActiveProjectRepositories } from '@neoglito/web/hooks/projects/use-project-selectors';
import type { Project } from '@neoglito/web/models/project';
import type { AnalyzeState } from '@neoglito/web/state/projects/projects.reducer';
import { useProjectsDispatch } from '@neoglito/web/state/projects/projects.context';

export function ProjectAnalyzeContainer({
  project,
  analyze,
}: {
  project: Project;
  analyze: AnalyzeState;
}) {
  const projectsDispatch = useProjectsDispatch();
  const repositories = useActiveProjectRepositories();

  return (
    <ProjectAnalyzeView
      project={project}
      repositories={repositories}
      analyze={analyze}
      onBack={() => projectsDispatch({ type: 'analyze-closed' })}
      onToggleGroup={(id) =>
        projectsDispatch({ type: 'analyze-group-toggled', repositoryId: id })
      }
      onSelectService={(key) =>
        projectsDispatch({ type: 'analyze-service-selected', key })
      }
      onTabChange={(tab) =>
        projectsDispatch({ type: 'analyze-tab-changed', tab })
      }
    />
  );
}
