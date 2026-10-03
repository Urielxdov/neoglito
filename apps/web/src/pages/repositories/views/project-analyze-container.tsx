import { ProjectAnalyzeView } from '@neoglito/web/components/repositories/project-analyze-view';
import { useActiveProjectRepositories } from '@neoglito/web/hooks/projects/use-project-selectors';
import type { Project } from '@neoglito/web/models/project';
import { useProjectAnalysis } from '@neoglito/web/hooks/projects/use-project-analysis';
import { useAnalysisDispatch } from '@neoglito/web/state/analysis/analysis.context';
import type { AnalyzeState } from '@neoglito/web/state/analysis/analysis.reducer';

export function ProjectAnalyzeContainer({
  project,
  analyze,
}: {
  project: Project;
  analyze: AnalyzeState;
}) {
  const analysisDispatch = useAnalysisDispatch();
  const { closeAnalysis } = useProjectAnalysis();
  const repositories = useActiveProjectRepositories();

  return (
    <ProjectAnalyzeView
      project={project}
      repositories={repositories}
      analyze={analyze}
      onBack={closeAnalysis}
      onToggleGroup={(id) =>
        analysisDispatch({ type: 'analyze-group-toggled', repositoryId: id })
      }
      onSelectService={(key) =>
        analysisDispatch({ type: 'analyze-service-selected', key })
      }
      onTabChange={(tab) =>
        analysisDispatch({ type: 'analyze-tab-changed', tab })
      }
    />
  );
}
