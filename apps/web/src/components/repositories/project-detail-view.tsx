import { Folder } from 'lucide';
import type { Project } from '@neoglito/web/models/project';
import type {
  DeployEnvVar,
  DeployComposePort,
} from '@neoglito/web/state/deploys/deploys.reducer';
import type { ProjectsDetailTab } from '@neoglito/web/state/projects/projects.reducer';
import { getMissingRequiredEnvCount } from '@neoglito/web/utils/deploys/compose.helpers';
import { AppIcon } from '@neoglito/web/components/ui/app-icon';
import { DeployFileList } from '@neoglito/web/components/repositories/deploy-file-list';
import { DeployFileDetail } from '@neoglito/web/components/repositories/deploy-file-detail';
import { ProjectGeneralTab } from '@neoglito/web/components/repositories/project-general-tab';

export interface ProjectDetailRepositoryInfo {
  id: number;
  name: string;
  language: string;
}

interface ProjectDetailViewProps {
  project: Project;
  repositories: ProjectDetailRepositoryInfo[];
  deployPaths: Record<string, string>;
  deployPathCandidates: Record<string, string[]>;
  deployEnv: Record<string, DeployEnvVar[]>;
  deployPorts: Record<string, DeployComposePort[]>;
  openKey: string | null;
  detailTab: ProjectsDetailTab;
  onTabChange(tab: ProjectsDetailTab): void;
  onBack(): void;
  onSelectDeployFile(key: string): void;
  onPathChange(key: string, path: string): void;
  onEnvAdd(key: string): void;
  onEnvRemove(key: string, index: number): void;
  onEnvChange(
    key: string,
    index: number,
    field: 'key' | 'value',
    value: string,
  ): void;
  onPortChange(
    key: string,
    index: number,
    dockerComposePath: string,
    publishedPort: string,
  ): void;
  onAnalyze(): void;
  editName: string;
  editDescription: string;
  editNameTaken: boolean;
  editClean: boolean;
  editSubmitting: boolean;
  editSaved: boolean;
  editMessage: string | null;
  onEditNameChange(name: string): void;
  onEditDescriptionChange(description: string): void;
  onEditReset(): void;
  onEditSave(): void;
}

function shortName(name: string): string {
  const parts = name.split('/');
  return parts[parts.length - 1];
}

export function ProjectDetailView({
  project,
  repositories,
  deployPaths,
  deployPathCandidates,
  deployEnv,
  deployPorts,
  openKey,
  detailTab,
  onTabChange,
  onBack,
  onSelectDeployFile,
  onPathChange,
  onEnvAdd,
  onEnvRemove,
  onEnvChange,
  onPortChange,
  onAnalyze,
  editName,
  editDescription,
  editNameTaken,
  editClean,
  editSubmitting,
  editSaved,
  editMessage,
  onEditNameChange,
  onEditDescriptionChange,
  onEditReset,
  onEditSave,
}: ProjectDetailViewProps) {
  const total = repositories.length;
  const readyCount = repositories.filter((repository) => {
    const key = `${project.id}:${repository.id}`;
    const path = (deployPaths[key] ?? '').trim();
    return (
      path.length > 0 && getMissingRequiredEnvCount(deployEnv[key] ?? []) === 0
    );
  }).length;
  const allReady = total > 0 && readyCount === total;

  const selectedKey =
    openKey ?? (repositories[0] ? `${project.id}:${repositories[0].id}` : null);
  const selectedRepository = selectedKey
    ? repositories.find(
        (repository) => `${project.id}:${repository.id}` === selectedKey,
      )
    : undefined;

  const tabs: Array<{ key: ProjectsDetailTab; label: string; count: string }> =
    [
      { key: 'deploy', label: 'Despliegue', count: `${readyCount}/${total}` },
      { key: 'routes', label: 'Rutas API', count: '0' },
      { key: 'repos', label: 'Repositorios', count: `${total}` },
      { key: 'general', label: 'General', count: '' },
    ];

  return (
    <>
      <header className="flex items-center gap-[14px] border-b border-[#e6eaf0] px-6 py-5 dark:border-[#253044]">
        <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]">
          <AppIcon icon={Folder} size={20} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
            {project.name}
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-[#8c98ac] dark:text-[#a7b4c8]">
            {project.description}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full bg-[#e6f4ec] px-2.5 text-[12px] font-semibold text-[#1d7a45] dark:bg-[#12291d] dark:text-[#5fcf8f]">
            Clonado
          </span>
          <button
            type="button"
            onClick={onBack}
            className="h-8 shrink-0 rounded-lg border border-[#d6dce5] bg-white px-3 text-[12.5px] font-semibold text-[#51607a] hover:bg-[#f1f5f9] dark:border-[#2e3a51] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]"
          >
            ← Proyectos
          </button>
        </span>
      </header>

      <div className="flex flex-col gap-[22px] p-5 sm:p-7">
        <div className="inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-[10px] border border-[#e6eaf0] bg-[#f8fafc] p-1 dark:border-[#253044] dark:bg-[#0c121d]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex h-[34px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[7px] px-[14px] text-[13px] font-semibold transition-colors ${
                detailTab === tab.key
                  ? 'bg-white text-[#16202e] shadow-[0_1px_2px_rgba(20,32,46,0.05),0_1px_1px_rgba(20,32,46,0.04)] dark:bg-[#111826] dark:text-[#e8edf6]'
                  : 'text-[#8c98ac] hover:text-[#51607a] dark:text-[#7a8699] dark:hover:text-[#a7b4c8]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count && (
                <span className="text-[11.5px] font-semibold text-[#8c98ac] dark:text-[#7a8699]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {detailTab === 'deploy' && selectedKey && (
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
                onSelect={onSelectDeployFile}
              />

              {selectedRepository && (
                <DeployFileDetail
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
                  onPathChange={(path) => onPathChange(selectedKey, path)}
                  onEnvAdd={() => onEnvAdd(selectedKey)}
                  onEnvRemove={(index) => onEnvRemove(selectedKey, index)}
                  onEnvChange={(index, field, value) =>
                    onEnvChange(selectedKey, index, field, value)
                  }
                  onPortChange={(index, dockerComposePath, publishedPort) =>
                    onPortChange(
                      selectedKey,
                      index,
                      dockerComposePath,
                      publishedPort,
                    )
                  }
                />
              )}
            </div>
          </div>
        )}

        {detailTab === 'routes' && (
          <div className="flex flex-col gap-4">
            <span className="text-[13px] leading-[1.5] text-[#8c98ac] dark:text-[#7a8699]">
              Archivos OpenAPI o Swagger detectados en cada repositorio.
            </span>
            <div className="flex flex-col gap-2.5">
              {repositories.map((repository) => (
                <div
                  key={repository.id}
                  className="flex items-center gap-[14px] rounded-lg border border-[#e0e6ef] bg-white px-4 py-[13px] dark:border-[#253044] dark:bg-[#111826]"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-[14px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
                      {shortName(repository.name)}
                    </span>
                    <span className="truncate text-[12.5px] text-[#aab3c2] dark:text-[#5f6b7e]">
                      Sin especificación detectada
                    </span>
                  </span>
                  <span className="inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full bg-[#f1f5f9] px-2.5 text-[11.5px] font-semibold text-[#8c98ac] dark:bg-[#1a2334] dark:text-[#7a8699]">
                    No encontrado
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {detailTab === 'repos' && (
          <div className="overflow-hidden rounded-lg border border-[#e0e6ef] dark:border-[#253044]">
            <div className="grid grid-cols-[minmax(0,1fr)_120px_74px] gap-3 bg-[#f8fafc] px-4 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#8c98ac] dark:bg-[#0c121d] dark:text-[#7a8699]">
              <span>Repositorio</span>
              <span>Tecnología</span>
              <span>Estado</span>
            </div>
            {repositories.map((repository, index) => (
              <div
                key={repository.id}
                className={`grid grid-cols-[minmax(0,1fr)_120px_74px] items-center gap-3 px-4 py-[13px] ${
                  index === 0
                    ? ''
                    : 'border-t border-[#e6eaf0] dark:border-[#253044]'
                }`}
              >
                <span className="truncate font-mono text-[13px] font-medium text-[#16202e] dark:text-[#e8edf6]">
                  {shortName(repository.name)}
                </span>
                <span className="text-[13px] text-[#51607a] dark:text-[#a7b4c8]">
                  {repository.language}
                </span>
                <span>
                  <span className="inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full bg-[#e6f4ec] px-2.5 text-[11.5px] font-semibold text-[#1d7a45] dark:bg-[#12291d] dark:text-[#5fcf8f]">
                    Listo
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        {detailTab === 'general' && (
          <ProjectGeneralTab
            name={editName}
            description={editDescription}
            nameTaken={editNameTaken}
            clean={editClean}
            submitting={editSubmitting}
            saved={editSaved}
            message={editMessage}
            meta={`Creado ${project.createdAt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            onNameChange={onEditNameChange}
            onDescriptionChange={onEditDescriptionChange}
            onReset={onEditReset}
            onSave={onEditSave}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6eaf0] bg-[#f8fafc] px-6 py-4 dark:border-[#253044] dark:bg-[#0c121d]">
        <span className="text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]">
          {`${readyCount} de ${total} archivos listos`}
        </span>
        <button
          type="button"
          disabled={!allReady}
          onClick={onAnalyze}
          className="h-10 rounded-lg bg-[#2257c4] px-[18px] text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(34,87,196,0.35)] enabled:hover:bg-[#1c489f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Analizar
        </button>
      </div>
    </>
  );
}
