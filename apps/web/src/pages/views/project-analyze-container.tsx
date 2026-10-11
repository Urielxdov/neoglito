import { useReducer } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  useAnalysisState,
  useAnalysisDispatch,
} from '@neoglito/web/features/analysis/analysis.context';
import { analysisReducer } from '@neoglito/web/features/analysis/analysis.reducer';
import { createSavedAnalysisState } from '@neoglito/web/features/analysis/saved-analysis';
import { deploymentService } from '@neoglito/web/features/projects/deployment.service';
import { ProjectAnalyzeView } from '@neoglito/web/features/projects/components/analyze/project-analyze-view';
import { ProjectAnalysisProvider } from '@neoglito/web/features/analysis/project-analysis.context';
import { useActiveProjectRepositories } from '@neoglito/web/features/projects/hooks/use-project-selectors';
import { useRouteProject } from '@neoglito/web/features/projects/hooks/use-route-project';
import type { Project } from '@neoglito/web/features/projects/project.model';
import type { DeploymentResponse } from '@neoglito/web/shared/api/contracts';
import type {
  AnalyzeState,
  AnalysisAction,
} from '@neoglito/web/features/analysis/analysis.reducer';
import type { Dispatch } from 'react';

function AnalysisView({
  project,
  analyze,
  dispatch,
}: {
  project: Project;
  analyze: AnalyzeState;
  dispatch: Dispatch<AnalysisAction>;
}) {
  const repositories = useActiveProjectRepositories();
  const navigate = useNavigate();
  return (
    <ProjectAnalysisProvider
      value={{
        project,
        repositories,
        analyze,
        onBack: () => navigate(`/projects/${project.id}/deploy`),
      }}
      dispatch={dispatch}
    >
      <ProjectAnalyzeView />
    </ProjectAnalysisProvider>
  );
}

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
    <AnalysisView project={project} analyze={analysis} dispatch={dispatch} />
  );
}

export function ProjectAnalyzeContainer() {
  const project = useRouteProject();
  const analysis = useAnalysisState();
  const dispatch = useAnalysisDispatch();
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
      <AnalysisView
        project={project}
        analyze={sessionAnalysis}
        dispatch={dispatch}
      />
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
