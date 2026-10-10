import type { Project } from '@neoglito/web/features/projects/project.model';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  assignedDeploymentPort,
  deploymentPortsQueryKey,
  loadProjectDeploymentPorts,
} from '@neoglito/web/features/projects/deployment-assigned-ports';
import type { ProjectDetailRepositoryInfo } from '@neoglito/web/features/projects/components/detail/project-detail-view';
import { DeployFileList } from '@neoglito/web/features/projects/components/deploy/deploy-file-list';
import { DeployFileDetail } from '@neoglito/web/features/projects/components/deploy/deploy-file-detail';
import {
  useDeploysDispatch,
  useDeploysState,
} from '@neoglito/web/features/deploys/deploys.context';
import { shortName } from '@neoglito/web/features/repositories/repository-name';
import { Link } from 'react-router-dom';

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
  const assignedPorts = useQuery({
    queryKey: deploymentPortsQueryKey(project.id),
    queryFn: () => loadProjectDeploymentPorts(project.id),
    refetchOnMount: 'always',
    retry: false,
  });

  const selectedKey =
    openDeployKey ??
    (repositories[0] ? `${project.id}:${repositories[0].id}` : null);
  const selectedRepository = selectedKey
    ? repositories.find(
        (repository) => `${project.id}:${repository.id}` === selectedKey,
      )
    : undefined;

  useEffect(() => {
    if (
      !selectedKey ||
      !assignedPorts.data ||
      assignedPorts.isFetching ||
      assignedPorts.isError
    )
      return;
    const ports = deployPorts[selectedKey] ?? [];
    ports.forEach((port, index) => {
      const assigned = assignedDeploymentPort(
        port,
        ports,
        deployPathCandidates[selectedKey] ?? [],
        assignedPorts.data,
      );
      if (assigned !== null && port.publishedPort !== assigned) {
        dispatch({
          type: 'deploy-port-changed',
          key: selectedKey,
          index,
          dockerComposePath: port.dockerComposePath,
          publishedPort: assigned,
        });
      }
    });
  }, [
    selectedKey,
    assignedPorts.data,
    assignedPorts.isFetching,
    assignedPorts.isError,
    deployPorts,
    deployPathCandidates,
    dispatch,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e0e6ef] p-4 dark:border-[#253044]">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
            Análisis de despliegues existentes
          </span>
          <p className="text-[13px] text-[#8c98ac] dark:text-[#7a8699]">
            Consulta los servicios y su clasificación guardados.
          </p>
        </div>
        <Link
          to={`/projects/${project.id}/analysis?view=saved`}
          className="rounded-lg border border-[#d6dce5] px-3 py-2 text-[13px] font-semibold text-[#2257c4] hover:bg-[#f1f5f9] dark:border-[#2e3a51] dark:text-[#5b8df5] dark:hover:bg-[#1a2334]"
        >
          Ver análisis existente
        </Link>
      </div>
      <span className="text-[13px] leading-[1.5] text-[#8c98ac] dark:text-[#7a8699]">
        Cada repositorio usa un archivo de despliegue. Selecciónalo para
        confirmar la ruta y llenar sus variables de entorno.
      </span>

      {selectedKey && (
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
              key={selectedKey}
              assignedDeployments={assignedPorts.data ?? []}
              checkingDeploymentPorts={
                assignedPorts.isPending || assignedPorts.isFetching
              }
              deploymentPortsError={assignedPorts.error?.message ?? null}
              onRetryDeploymentPorts={() => {
                void assignedPorts.refetch();
              }}
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
                dispatch({
                  type: 'deploy-path-changed',
                  key: selectedKey,
                  path,
                })
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
      )}
    </div>
  );
}
