import { useReducer } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useAnalysisState } from '@neoglito/web/features/analysis/analysis.context';
import { analysisReducer } from '@neoglito/web/features/analysis/analysis.reducer';
import { createSavedAnalysisState } from '@neoglito/web/features/analysis/saved-analysis';
import { deploymentService } from '@neoglito/web/features/projects/deployment.service';
import { ProjectAnalyzeContainer } from '@neoglito/web/pages/views/project-analyze-container';
import { useRouteProject } from '@neoglito/web/features/projects/hooks/use-route-project';
import type { Project } from '@neoglito/web/features/projects/project.model';
import type { DeploymentResponse } from '@neoglito/web/shared/api/contracts';

function SavedAnalysis({
  project,
  deployments,
}: {
  project: Project;
  deployments: DeploymentResponse[];
}) {
  const [analysis, dispatch] = useReducer(
    analysisReducer,
    { projectId: project.id, deployments },
    createSavedAnalysisState,
  );
  if (!analysis) return null;
  return (
    <ProjectAnalyzeContainer
      project={project}
      analyze={analysis}
      dispatch={dispatch}
    />
  );
}

export default function ProjectAnalysisPage() {
  const project = useRouteProject();
  const analysis = useAnalysisState();
  const [params] = useSearchParams();
  const sessionAnalysis =
    params.get('view') !== 'saved' && analysis?.projectId === project.id
      ? analysis
      : null;
  const savedAnalysis = useQuery({
    queryKey: ['saved-project-analysis', project.id],
    queryFn: () => deploymentService.getSavedAnalysis(project.id),
    enabled: !sessionAnalysis,
    retry: false,
    refetchOnMount: 'always',
  });

  if (sessionAnalysis) {
    return (
      <ProjectAnalyzeContainer project={project} analyze={sessionAnalysis} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {savedAnalysis.isPending && (
        <p role="status">Recuperando análisis guardado...</p>
      )}
      {savedAnalysis.isError && (
        <div role="alert">
          <p>{savedAnalysis.error.message}</p>
          <button type="button" onClick={() => void savedAnalysis.refetch()}>
            Reintentar
          </button>
        </div>
      )}
      {savedAnalysis.data && savedAnalysis.data.length === 0 && (
        <p>No hay despliegues registrados para este proyecto.</p>
      )}
      {savedAnalysis.data && savedAnalysis.data.length > 0 ? (
        <SavedAnalysis
          key={`${project.id}:${savedAnalysis.dataUpdatedAt}`}
          project={project}
          deployments={savedAnalysis.data}
        />
      ) : (
        <Link
          to={`/projects/${project.id}/deploy`}
          className="text-[#2257c4] dark:text-[#5b8df5]"
        >
          Ir a despliegue
        </Link>
      )}
    </div>
  );
}
