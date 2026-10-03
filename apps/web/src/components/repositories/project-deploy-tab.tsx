import type { Project } from '@neoglito/web/models/project';
import type { ProjectDetailRepositoryInfo } from '@neoglito/web/components/repositories/project-detail-view';
import { DeployFileList } from '@neoglito/web/components/repositories/deploy-file-list';
import { DeployFileDetail } from '@neoglito/web/components/repositories/deploy-file-detail';
import {
  useDeploysDispatch,
  useDeploysState,
} from '@neoglito/web/state/deploys/deploys.context';
import { shortName } from '@neoglito/web/utils/repository-name';

interface ProjectDeployTabProps {
  project: Project;
  repositories: ProjectDetailRepositoryInfo[];
}

export function ProjectDeployTab({
  project,
  repositories,
}: ProjectDeployTabProps) {
  const {
    deployPaths,
    deployPathCandidates,
    deployEnv,
    deployPorts,
    openDeployKey,
  } = useDeploysState();
  const dispatch = useDeploysDispatch();

  const selectedKey =
    openDeployKey ??
    (repositories[0] ? `${project.id}:${repositories[0].id}` : null);
  const selectedRepository = selectedKey
    ? repositories.find(
        (repository) => `${project.id}:${repository.id}` === selectedKey,
      )
    : undefined;

  if (!selectedKey) return null;

  return (
    <div className="flex flex-col gap-4">
      <span className="text-[13px] leading-[1.5] text-[#8c98ac] dark:text-[#7a8699]">
        Cada repositorio usa un archivo de despliegue. Selecciónalo para
        confirmar la ruta y llenar sus variables de entorno.
      </span>

      <div className="flex flex-wrap items-start gap-4">
        <DeployFileList
          projectId={project.id}
          repositories={repositories}
          deployPaths={deployPaths}
          deployEnv={deployEnv}
          selectedKey={selectedKey}
          onSelect={(key) => dispatch({ type: 'deploy-row-toggled', key })}
        />

        {selectedRepository && (
          <DeployFileDetail
            projectId={project.id}
            repositoryName={shortName(selectedRepository.name)}
            path={deployPaths[selectedKey] ?? ''}
            candidates={deployPathCandidates[selectedKey] ?? []}
            env={deployEnv[selectedKey] ?? []}
            ports={(deployPorts[selectedKey] ?? [])
              .map((port, index) => ({ port, index }))
              .filter(
                ({ port }) =>
                  port.dockerComposePath.replace(/\\/g, '/') ===
                  (deployPaths[selectedKey] ?? '').replace(/\\/g, '/'),
              )}
            onPathChange={(path) =>
              dispatch({ type: 'deploy-path-changed', key: selectedKey, path })
            }
            onEnvAdd={() =>
              dispatch({ type: 'deploy-env-row-added', key: selectedKey })
            }
            onEnvRemove={(index) =>
              dispatch({
                type: 'deploy-env-row-removed',
                key: selectedKey,
                index,
              })
            }
            onEnvChange={(index, field, value) =>
              dispatch({
                type: 'deploy-env-row-changed',
                key: selectedKey,
                index,
                field,
                value,
              })
            }
            onPortChange={(index, dockerComposePath, publishedPort) =>
              dispatch({
                type: 'deploy-port-changed',
                key: selectedKey,
                index,
                dockerComposePath,
                publishedPort,
              })
            }
          />
        )}
      </div>
    </div>
  );
}
