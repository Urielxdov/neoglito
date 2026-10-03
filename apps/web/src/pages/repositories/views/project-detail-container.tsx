import { ProjectDetailPanel } from '@neoglito/web/components/repositories/project-detail-panel';
import { useProjectAnalysis } from '@neoglito/web/hooks/projects/use-project-analysis';
import { useProjectEditing } from '@neoglito/web/hooks/projects/use-project-editing';
import { useActiveProjectRepositories } from '@neoglito/web/hooks/projects/use-project-selectors';
import type { Project } from '@neoglito/web/models/project';
import {
  useDeploysDispatch,
  useDeploysState,
} from '@neoglito/web/state/deploys/deploys.context';
import {
  useProjectsDispatch,
  useProjectsState,
} from '@neoglito/web/state/projects/projects.context';

export function ProjectDetailContainer({ project }: { project: Project }) {
  const projectsState = useProjectsState();
  const projectsDispatch = useProjectsDispatch();
  const deploysState = useDeploysState();
  const deploysDispatch = useDeploysDispatch();
  const repositories = useActiveProjectRepositories();
  const editing = useProjectEditing();
  const { startAnalysis } = useProjectAnalysis();

  return (
    <ProjectDetailPanel
      project={project}
      repositories={repositories}
      deployPaths={deploysState.deployPaths}
      deployPathCandidates={deploysState.deployPathCandidates}
      deployEnv={deploysState.deployEnv}
      deployPorts={deploysState.deployPorts}
      openKey={deploysState.openDeployKey}
      detailTab={projectsState.detailTab}
      onTabChange={(tab) =>
        projectsDispatch({ type: 'detail-tab-changed', tab })
      }
      onBack={() => {
        projectsDispatch({ type: 'detail-closed' });
        deploysDispatch({ type: 'deploy-row-closed' });
      }}
      onSelectDeployFile={(key) =>
        deploysDispatch({ type: 'deploy-row-toggled', key })
      }
      onPathChange={(key, path) =>
        deploysDispatch({ type: 'deploy-path-changed', key, path })
      }
      onEnvAdd={(key) => deploysDispatch({ type: 'deploy-env-row-added', key })}
      onEnvRemove={(key, index) =>
        deploysDispatch({ type: 'deploy-env-row-removed', key, index })
      }
      onEnvChange={(key, index, field, value) =>
        deploysDispatch({
          type: 'deploy-env-row-changed',
          key,
          index,
          field,
          value,
        })
      }
      onPortChange={(key, index, dockerComposePath, publishedPort) =>
        deploysDispatch({
          type: 'deploy-port-changed',
          key,
          index,
          dockerComposePath,
          publishedPort,
        })
      }
      onAnalyze={startAnalysis}
      editName={editing.editName}
      editDescription={editing.editDescription}
      editNameTaken={editing.editNameTaken}
      editClean={editing.editClean}
      editSubmitting={projectsState.editSubmitting}
      editSaved={projectsState.editSaved}
      editMessage={projectsState.editMessage}
      onEditNameChange={(name) =>
        projectsDispatch({ type: 'edit-name-changed', name })
      }
      onEditDescriptionChange={(description) =>
        projectsDispatch({ type: 'edit-description-changed', description })
      }
      onEditReset={() => projectsDispatch({ type: 'edit-reset' })}
      onEditSave={() => void editing.handleSaveGeneral()}
    />
  );
}
