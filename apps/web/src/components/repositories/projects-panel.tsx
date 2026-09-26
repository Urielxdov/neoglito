import type { Dispatch } from 'react';
import { Folder } from 'lucide';
import type { Project } from '../../models/project';
import type { Repository } from '../../models/repository';
import type {
  ProjectsAction,
  ProjectsState,
} from '../../state/projects/projects.reducer';
import { shortName } from '../../utils/repository-name';
import { AppIcon } from '../ui/app-icon';
import { CreateProjectForm } from './create-project-form';
import { InitializingOverlay } from './initializing-overlay';
import { ProjectDetailView } from './project-detail-view';
import type { ProjectDetailRepositoryInfo } from './project-detail-view';
import { ProjectListItem } from './project-list-item';

interface ProjectsPanelProps {
  activeProject: Project | null;
  activeProjectRepositories: ProjectDetailRepositoryInfo[];
  canCreateProject: boolean;
  nameTaken: boolean;
  projectsDispatch: Dispatch<ProjectsAction>;
  projectsState: ProjectsState;
  selectedRepositories: Repository[];
  onCreateProject(): void;
  onOpenProject(id: number): void;
}

export function ProjectsPanel({
  activeProject,
  activeProjectRepositories,
  canCreateProject,
  nameTaken,
  projectsDispatch,
  projectsState,
  selectedRepositories,
  onCreateProject,
  onOpenProject,
}: ProjectsPanelProps) {
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
      {projectsState.phase === 'detail' && activeProject ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ProjectDetailView
            project={activeProject}
            repositories={activeProjectRepositories}
            deployPaths={projectsState.deployPaths}
            deployPathCandidates={projectsState.deployPathCandidates}
            deployEnv={projectsState.deployEnv}
            openKey={projectsState.openDeployKey}
            configured={projectsState.configuredProjectIds.has(
              activeProject.id,
            )}
            detailTab={projectsState.detailTab}
            onTabChange={(tab) =>
              projectsDispatch({ type: 'detail-tab-changed', tab })
            }
            onBack={() => projectsDispatch({ type: 'detail-closed' })}
            onToggleRow={(key) =>
              projectsDispatch({ type: 'deploy-row-toggled', key })
            }
            onPathChange={(key, path) =>
              projectsDispatch({ type: 'deploy-path-changed', key, path })
            }
            onEnvAdd={(key) =>
              projectsDispatch({ type: 'deploy-env-row-added', key })
            }
            onEnvRemove={(key, index) =>
              projectsDispatch({ type: 'deploy-env-row-removed', key, index })
            }
            onEnvChange={(key, index, field, value) =>
              projectsDispatch({
                type: 'deploy-env-row-changed',
                key,
                index,
                field,
                value,
              })
            }
            onConfigure={() =>
              projectsDispatch({
                type: 'deploy-configured',
                projectId: activeProject.id,
              })
            }
          />
        </div>
      ) : (
        <>
          <header className="flex shrink-0 items-center gap-[14px] border-b border-[#e6eaf0] px-6 py-5 dark:border-[#253044]">
            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]">
              <AppIcon icon={Folder} size={20} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold">Proyectos</span>
              <span className="mt-0.5 block text-[13px] text-[#8c98ac] dark:text-[#a7b4c8]">
                {projectsState.projects.length}{' '}
                {projectsState.projects.length === 1 ? 'proyecto' : 'proyectos'}{' '}
                · un repositorio puede estar en varios
              </span>
            </span>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto p-5 sm:p-7">
            {projectsState.creating && selectedRepositories.length > 0 && (
              <CreateProjectForm
                name={projectsState.newName}
                description={projectsState.newDescription}
                nameTaken={nameTaken}
                selectedRepositoryNames={selectedRepositories.map(
                  (repository) => shortName(repository.name),
                )}
                canCreate={canCreateProject}
                submitting={projectsState.submitting}
                onNameChange={(name) =>
                  projectsDispatch({ type: 'name-changed', name })
                }
                onDescriptionChange={(description) =>
                  projectsDispatch({
                    type: 'description-changed',
                    description,
                  })
                }
                onCancel={() =>
                  projectsDispatch({ type: 'creation-cancelled' })
                }
                onCreate={onCreateProject}
              />
            )}

            {projectsState.message && (
              <p className="text-[12.5px] text-[#c2410c] dark:text-[#fb923c]">
                {projectsState.message}
              </p>
            )}

            <div className="flex flex-col gap-[10px]">
              {projectsState.status === 'loading' ? (
                <p className="px-4 py-8 text-center text-[13px] text-[#8c98ac]">
                  Cargando proyectos...
                </p>
              ) : projectsState.projects.length > 0 ? (
                projectsState.projects.map((project) => (
                  <ProjectListItem
                    key={project.id}
                    project={project}
                    onOpen={onOpenProject}
                  />
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-[#c8d0dc] px-4 py-[34px] text-center text-[13px] text-[#8c98ac] dark:border-[#2e3a51] dark:text-[#7a8699]">
                  Aún no hay proyectos. Selecciona repositorios y pulsa "Nuevo
                  Proyecto".
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {projectsState.progress && (
        <InitializingOverlay
          name={projectsState.newName.trim()}
          done={projectsState.progress.done}
          total={projectsState.progress.total}
          label={projectsState.progress.label}
        />
      )}
    </section>
  );
}
