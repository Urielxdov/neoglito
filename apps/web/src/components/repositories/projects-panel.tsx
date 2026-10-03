import { Folder } from 'lucide';
import type { Project } from '@neoglito/web/models/project';
import type { CreationProgress } from '@neoglito/web/state/projects/projects.reducer';
import { AppIcon } from '@neoglito/web/components/ui/app-icon';
import { CreateProjectForm } from '@neoglito/web/components/repositories/create-project-form';
import { InitializingOverlay } from '@neoglito/web/components/repositories/initializing-overlay';
import { ProjectListItem } from '@neoglito/web/components/repositories/project-list-item';

interface ProjectsPanelProps {
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;
  creating: boolean;
  newName: string;
  newDescription: string;
  nameTaken: boolean;
  selectedRepositoryNames: string[];
  canCreateProject: boolean;
  submitting: boolean;
  creationProgress: CreationProgress | null;
  onNameChange(name: string): void;
  onDescriptionChange(description: string): void;
  onCancelCreation(): void;
  onCreateProject(): void;
  onOpenProject(id: number): void;
}

export function ProjectsPanel({
  projects,
  projectsLoading,
  projectsError,
  creating,
  newName,
  newDescription,
  nameTaken,
  selectedRepositoryNames,
  canCreateProject,
  submitting,
  creationProgress,
  onNameChange,
  onDescriptionChange,
  onCancelCreation,
  onCreateProject,
  onOpenProject,
}: ProjectsPanelProps) {
  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
      <header className="flex shrink-0 items-center gap-[14px] border-b border-[#e6eaf0] px-6 py-5 dark:border-[#253044]">
        <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]">
          <AppIcon icon={Folder} size={20} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">Proyectos</span>
          <span className="mt-0.5 block text-[13px] text-[#8c98ac] dark:text-[#a7b4c8]">
            {projects.length}{' '}
            {projects.length === 1 ? 'proyecto' : 'proyectos'} · un
            repositorio puede estar en varios
          </span>
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto p-5 sm:p-7">
        {creating && selectedRepositoryNames.length > 0 && (
          <CreateProjectForm
            name={newName}
            description={newDescription}
            nameTaken={nameTaken}
            selectedRepositoryNames={selectedRepositoryNames}
            canCreate={canCreateProject}
            submitting={submitting}
            onNameChange={onNameChange}
            onDescriptionChange={onDescriptionChange}
            onCancel={onCancelCreation}
            onCreate={onCreateProject}
          />
        )}

        {projectsError && (
          <p className="text-[12.5px] text-[#c2410c] dark:text-[#fb923c]">
            {projectsError}
          </p>
        )}

        <div className="flex flex-col gap-[10px]">
          {projectsLoading ? (
            <p className="px-4 py-8 text-center text-[13px] text-[#8c98ac]">
              Cargando proyectos...
            </p>
          ) : projects.length > 0 ? (
            projects.map((project) => (
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

      {creationProgress && (
        <InitializingOverlay
          name={newName.trim()}
          done={creationProgress.done}
          total={creationProgress.total}
          label={creationProgress.label}
        />
      )}
    </section>
  );
}
