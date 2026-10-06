import { ProjectAnalyzeContainer } from '@neoglito/web/pages/views/project-analyze-container';
import { ProjectDetailContainer } from '@neoglito/web/pages/views/project-detail-container';
import { ProjectDetailModal } from '@neoglito/web/features/projects/components/list/project-detail-modal';
import { ProjectsPanelContainer } from '@neoglito/web/pages/views/projects-panel-container';
import { RepositorySelectionContainer } from '@neoglito/web/pages/views/repository-selection-container';
import {
  useActiveProject,
  useOpenProject,
  useOpenProjectRepositories,
} from '@neoglito/web/features/projects/hooks/use-project-selectors';
import { AnalysisProvider, useAnalysisState } from '@neoglito/web/features/analysis/analysis.context';
import { DeploysProvider, useDeploysDispatch } from '@neoglito/web/features/deploys/deploys.context';
import { ProjectsProvider, useProjectsDispatch, useProjectsState } from '@neoglito/web/features/projects/projects.context';
import { RepositoriesProvider } from '@neoglito/web/features/repositories/repositories.context';
import { usePorts } from '@neoglito/web/features/ports/use-ports';

function RepositorySelectionLayout() {
  usePorts();
  const projectsState = useProjectsState();
  const analysisState = useAnalysisState();
  const projectsDispatch = useProjectsDispatch();
  const deploysDispatch = useDeploysDispatch();
  const activeProject = useActiveProject();
  const openProject = useOpenProject();
  const openProjectRepositories = useOpenProjectRepositories();

  const renderView = () => {
    if (
      projectsState.phase === 'analyze' &&
      activeProject &&
      analysisState
    ) {
      return (
        <ProjectAnalyzeContainer
          project={activeProject}
          analyze={analysisState}
        />
      );
    }

    if (projectsState.phase === 'detail') {
      return (
        <div className="mx-auto mt-[22px] min-h-0 w-full max-w-[960px] flex-1">
          {activeProject ? (
            <ProjectDetailContainer project={activeProject} />
          ) : (
            <ProjectsPanelContainer />
          )}
        </div>
      );
    }

    return (
      <div className="mt-[22px] grid min-h-0 w-full flex-1 grid-cols-1 gap-[22px] lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RepositorySelectionContainer />
        <ProjectsPanelContainer />
      </div>
    );
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-6 pb-6 font-sans text-[#16202e] dark:text-[#e8edf6]">
      {renderView()}

      {openProject && (
        <ProjectDetailModal
          project={openProject}
          repositories={openProjectRepositories}
          onClose={() => projectsDispatch({ type: 'project-closed' })}
          onViewDeploy={() => {
            projectsDispatch({ type: 'detail-opened', id: openProject.id });
            deploysDispatch({ type: 'deploy-row-closed' });
          }}
        />
      )}
    </main>
  );
}

export default function RepositorySelectionPage() {
  return (
    <RepositoriesProvider>
      <ProjectsProvider>
        <DeploysProvider>
          <AnalysisProvider>
            <RepositorySelectionLayout />
          </AnalysisProvider>
        </DeploysProvider>
      </ProjectsProvider>
    </RepositoriesProvider>
  );
}
