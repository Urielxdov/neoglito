import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { CreateProjectForm } from '../../components/repositories/create-project-form'
import { InitializingOverlay } from '../../components/repositories/initializing-overlay'
import { ProjectDetailModal } from '../../components/repositories/project-detail-modal'
import type { ProjectDetailRepository } from '../../components/repositories/project-detail-modal'
import { ProjectDetailView } from '../../components/repositories/project-detail-view'
import type { ProjectDetailRepositoryInfo } from '../../components/repositories/project-detail-view'
import { ProjectListItem } from '../../components/repositories/project-list-item'
import { RepositoryListItem } from '../../components/repositories/repository-list-item'
import { projectService } from '../../services/project.service'
import { repositoryService } from '../../services/repository.service'
import { useAuth } from '../../state/auth/auth-context'
import {
  initialProjectsState,
  projectsReducer,
} from '../../state/projects/projects.reducer'
import {
  initialRepositoriesState,
  repositoriesReducer,
} from '../../state/repositories/repositories.reducer'

function shortName(name: string): string {
  const parts = name.split('/')
  return parts[parts.length - 1]
}

export default function RepositorySelectionPage() {
  const { user } = useAuth()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [repositoriesState, repositoriesDispatch] = useReducer(repositoriesReducer, initialRepositoriesState)
  const [projectsState, projectsDispatch] = useReducer(projectsReducer, initialProjectsState)

  const dark = theme === 'dark'
  const normalizedQuery = repositoriesState.query.trim().toLowerCase()
  const visibleRepositories = repositoriesState.repositories.filter((repository) => (
    repository.name.toLowerCase().includes(normalizedQuery)
    || repository.description.toLowerCase().includes(normalizedQuery)
  ))

  useEffect(() => {
    const loadRepositories = async () => {
      const response = await repositoryService.getAll()

      if (response.success && response.data) {
        repositoriesDispatch({ type: 'load-succeeded', repositories: response.data })
        return
      }

      repositoriesDispatch({
        type: 'load-failed',
        message: response.error?.message ?? 'No fue posible cargar los repositorios.',
      })
    }

    void loadRepositories()
  }, [])

  const loadProjects = useCallback(async () => {
    const response = await projectService.getAll()

    if (response.success && response.data) {
      projectsDispatch({ type: 'load-succeeded', projects: response.data })
      return
    }

    projectsDispatch({
      type: 'load-failed',
      message: response.error?.message ?? 'No fue posible cargar los proyectos.',
    })
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const projectCountByRepositoryId = useMemo(() => {
    const counts = new Map<number, number>()

    for (const project of projectsState.projects) {
      for (const repository of project.repositories) {
        counts.set(repository.id, (counts.get(repository.id) ?? 0) + 1)
      }
    }

    return counts
  }, [projectsState.projects])

  const allVisibleRepositoriesSelected = visibleRepositories.length > 0
    && visibleRepositories.every((repository) => repositoriesState.selectedIds.has(repository.id))

  const selectedRepositories = repositoriesState.repositories.filter((repository) => (
    repositoriesState.selectedIds.has(repository.id)
  ))

  const nameTaken = projectsState.newName.trim().length > 0 && projectsState.projects.some((project) => (
    project.name.trim().toLowerCase() === projectsState.newName.trim().toLowerCase()
  ))

  const canCreateProject = projectsState.newName.trim().length > 0
    && projectsState.newDescription.trim().length > 0
    && !nameTaken
    && selectedRepositories.length > 0
    && !projectsState.submitting

  const handleClearSelection = () => {
    repositoriesDispatch({ type: 'selection-cleared' })
    projectsDispatch({ type: 'creation-cancelled' })
  }

  const handleNewProject = () => {
    if (selectedRepositories.length > 0) {
      projectsDispatch({ type: 'creation-opened' })
    }
  }

  const handleCreateProject = async () => {
    if (!canCreateProject) return

    const name = projectsState.newName.trim()
    const description = projectsState.newDescription.trim()
    const repositoriesToLink = selectedRepositories
    const total = repositoriesToLink.length + 1

    projectsDispatch({ type: 'creation-submitting' })
    projectsDispatch({ type: 'creation-progress', done: 0, total, label: 'Creando proyecto' })

    const projectResponse = await projectService.create({ name, description })

    if (!projectResponse.success || !projectResponse.data) {
      projectsDispatch({
        type: 'creation-failed',
        message: projectResponse.error?.message ?? 'No fue posible crear el proyecto.',
      })
      return
    }

    const projectId = projectResponse.data.id

    for (const [index, repository] of repositoriesToLink.entries()) {
      projectsDispatch({
        type: 'creation-progress',
        done: index + 1,
        total,
        label: `Vinculando ${shortName(repository.name)}`,
      })

      const linkResponse = await repositoryService.create({
        projectId,
        id: repository.id,
        name: repository.name,
        gitUrl: repository.gitUrl,
        cloneUrl: repository.cloneUrl,
      })

      if (!linkResponse.success) {
        projectsDispatch({
          type: 'creation-failed',
          message: `El proyecto se creó, pero no fue posible vincular ${repository.name}: ${linkResponse.error?.message ?? 'error desconocido'}`,
        })
        await loadProjects()
        return
      }
    }

    projectsDispatch({ type: 'creation-succeeded', projectId })
    repositoriesDispatch({ type: 'selection-cleared' })
    await loadProjects()
  }

  const openProject = projectsState.projects.find((project) => project.id === projectsState.openId) ?? null

  const openProjectRepositories: ProjectDetailRepository[] = openProject
    ? openProject.repositories.map((linkedRepository) => {
      const liveRepository = repositoriesState.repositories.find((repository) => repository.id === linkedRepository.id)
      const others = (projectCountByRepositoryId.get(linkedRepository.id) ?? 1) - 1

      return {
        id: linkedRepository.id,
        full: liveRepository?.name ?? linkedRepository.name,
        description: liveRepository?.description ?? 'Sin descripción',
        language: liveRepository?.language ?? 'Desconocido',
        visibility: liveRepository ? (liveRepository.private ? 'Privado' : 'Público') : 'Desconocido',
        shared: others === 0 ? 'Solo aquí' : others === 1 ? 'También en 1 proyecto' : `También en ${others} proyectos`,
      }
    })
    : []

  const activeProject = projectsState.projects.find((project) => project.id === projectsState.activeId) ?? null

  const activeProjectRepositories: ProjectDetailRepositoryInfo[] = activeProject
    ? activeProject.repositories.map((linkedRepository) => {
      const liveRepository = repositoriesState.repositories.find((repository) => repository.id === linkedRepository.id)

      return {
        id: linkedRepository.id,
        name: liveRepository?.name ?? linkedRepository.name,
        language: liveRepository?.language ?? 'Desconocido',
      }
    })
    : []

  return (
    <main
      data-theme={theme}
      className="min-h-screen bg-[#f8fafc] px-6 pb-20 pt-14 font-sans text-[#16202e] dark:bg-[#0c121d] dark:text-[#e8edf6]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4">
        <span className="text-[13px] font-semibold uppercase tracking-[0.09em] text-[#8c98ac] dark:text-[#7a8699]">
          Repositorios y proyectos
        </span>
        <button
          type="button"
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          className="inline-flex h-[34px] items-center gap-2 rounded-lg border border-[#d6dce5] bg-white px-[13px] text-[12.5px] font-semibold text-[#51607a] transition-colors hover:bg-[#f1f5f9] dark:border-[#2e3a51] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]"
        >
          <span>{dark ? '☀' : '☾'}</span>
          <span>{dark ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
      </div>

      <div className="mx-auto mt-[22px] grid w-full max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-[22px]">
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
          <header className="flex items-center gap-[14px] border-b border-[#e6eaf0] px-6 py-5 dark:border-[#253044]">
            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]">
              <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.4 7.4 0 0 1 8 3.5c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold">Selecciona repositorios</span>
              <span className="mt-0.5 block text-[13px] text-[#8c98ac] dark:text-[#a7b4c8]">
                Cuenta @{user?.username} · {repositoriesState.repositories.length} repositorios
              </span>
            </span>
          </header>

          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap gap-[10px]">
              <label className="flex h-[42px] min-w-[220px] flex-1 items-center gap-3 rounded-lg border border-[#d6dce5] px-4 text-[#8c98ac] dark:border-[#35435a] dark:bg-[#0c121d]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="shrink-0">
                  <circle cx="11" cy="11" r="6" />
                  <path d="m20 20-4.2-4.2" />
                </svg>
                <input
                  value={repositoriesState.query}
                  onChange={(event) => repositoriesDispatch({ type: 'query-changed', query: event.target.value })}
                  placeholder="Buscar repositorio"
                  className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] dark:text-[#e8edf6]"
                />
              </label>
              <button
                type="button"
                onClick={() => repositoriesDispatch({
                  type: 'visible-repositories-toggled',
                  ids: visibleRepositories.map((repository) => repository.id),
                })}
                disabled={repositoriesState.status !== 'ready' || visibleRepositories.length === 0}
                className="h-[42px] shrink-0 rounded-lg border border-[#d6dce5] bg-white px-4 text-[12.5px] font-semibold whitespace-nowrap text-[#394b6a] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#35435a] dark:bg-[#111826] dark:text-[#c1cbe0]"
              >
                {allVisibleRepositoriesSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-[#e0e6ef] dark:border-[#253044]">
              {repositoriesState.status === 'loading' ? (
                <p className="px-4 py-8 text-center text-[13px] text-[#8c98ac]">Cargando repositorios...</p>
              ) : repositoriesState.status === 'error' ? (
                <p className="px-4 py-8 text-center text-[13px] text-[#c2410c] dark:text-[#fb923c]">{repositoriesState.message}</p>
              ) : visibleRepositories.length > 0 ? (
                visibleRepositories.map((repository) => (
                  <RepositoryListItem
                    key={repository.id}
                    repository={repository}
                    selected={repositoriesState.selectedIds.has(repository.id)}
                    projectCount={projectCountByRepositoryId.get(repository.id) ?? 0}
                    onSelectionChange={(id) => repositoriesDispatch({ type: 'repository-toggled', id })}
                  />
                ))
              ) : (
                <p className="px-4 py-8 text-center text-[13px] text-[#8c98ac]">
                  {repositoriesState.query
                    ? `Ningún repositorio coincide con "${repositoriesState.query}".`
                    : 'No encontramos repositorios.'}
                </p>
              )}
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6eaf0] bg-[#f8fafc] px-6 py-4 sm:flex-nowrap dark:border-[#253044] dark:bg-[#0c121d]">
            <span className="text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]">
              {repositoriesState.selectedIds.size === 0
                ? 'Selecciona al menos un repositorio.'
                : `${repositoriesState.selectedIds.size} seleccionado${repositoriesState.selectedIds.size === 1 ? '' : 's'}`}
            </span>
            <span className="ml-0 flex gap-[10px] sm:ml-auto">
              <button
                type="button"
                onClick={handleClearSelection}
                className="h-10 rounded-lg border border-[#d6dce5] bg-white px-[18px] text-[13px] font-semibold text-[#51607a] hover:bg-[#f1f5f9] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#c1cbe0]"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={handleNewProject}
                disabled={repositoriesState.selectedIds.size === 0}
                className="h-10 rounded-lg bg-[#2257c4] px-[18px] text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(34,87,196,0.35)] enabled:hover:bg-[#1c489f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Nuevo Proyecto
              </button>
            </span>
          </footer>
        </section>

        <section className="relative overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
          {projectsState.phase === 'detail' && activeProject ? (
            <ProjectDetailView
              project={activeProject}
              repositories={activeProjectRepositories}
              deployPaths={projectsState.deployPaths}
              deployEnv={projectsState.deployEnv}
              openKey={projectsState.openDeployKey}
              configured={projectsState.configuredProjectIds.has(activeProject.id)}
              onBack={() => projectsDispatch({ type: 'detail-closed' })}
              onToggleRow={(key) => projectsDispatch({ type: 'deploy-row-toggled', key })}
              onPathChange={(key, path) => projectsDispatch({ type: 'deploy-path-changed', key, path })}
              onEnvAdd={(key) => projectsDispatch({ type: 'deploy-env-row-added', key })}
              onEnvRemove={(key, index) => projectsDispatch({ type: 'deploy-env-row-removed', key, index })}
              onEnvChange={(key, index, field, value) => projectsDispatch({ type: 'deploy-env-row-changed', key, index, field, value })}
              onConfigure={() => projectsDispatch({ type: 'deploy-configured', projectId: activeProject.id })}
            />
          ) : (
            <>
              <header className="flex items-center gap-[14px] border-b border-[#e6eaf0] px-6 py-5 dark:border-[#253044]">
                <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold">Proyectos</span>
                  <span className="mt-0.5 block text-[13px] text-[#8c98ac] dark:text-[#a7b4c8]">
                    {projectsState.projects.length} {projectsState.projects.length === 1 ? 'proyecto' : 'proyectos'} · un repositorio puede estar en varios
                  </span>
                </span>
              </header>

              <div className="flex flex-col gap-[14px] p-5 sm:p-7">
                {projectsState.creating && selectedRepositories.length > 0 && (
                  <CreateProjectForm
                    name={projectsState.newName}
                    description={projectsState.newDescription}
                    nameTaken={nameTaken}
                    selectedRepositoryNames={selectedRepositories.map((repository) => shortName(repository.name))}
                    canCreate={canCreateProject}
                    submitting={projectsState.submitting}
                    onNameChange={(name) => projectsDispatch({ type: 'name-changed', name })}
                    onDescriptionChange={(description) => projectsDispatch({ type: 'description-changed', description })}
                    onCancel={() => projectsDispatch({ type: 'creation-cancelled' })}
                    onCreate={() => void handleCreateProject()}
                  />
                )}

                {projectsState.message && (
                  <p className="text-[12.5px] text-[#c2410c] dark:text-[#fb923c]">{projectsState.message}</p>
                )}

                <div className="flex flex-col gap-[10px]">
                  {projectsState.status === 'loading' ? (
                    <p className="px-4 py-8 text-center text-[13px] text-[#8c98ac]">Cargando proyectos...</p>
                  ) : projectsState.projects.length > 0 ? (
                    projectsState.projects.map((project) => (
                      <ProjectListItem
                        key={project.id}
                        project={project}
                        onOpen={(id) => projectsDispatch({ type: 'project-opened', id })}
                      />
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed border-[#c8d0dc] px-4 py-[34px] text-center text-[13px] text-[#8c98ac] dark:border-[#2e3a51] dark:text-[#7a8699]">
                      Aún no hay proyectos. Selecciona repositorios y pulsa "Nuevo Proyecto".
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
      </div>

      {openProject && (
        <ProjectDetailModal
          project={openProject}
          repositories={openProjectRepositories}
          onClose={() => projectsDispatch({ type: 'project-closed' })}
          onViewDeploy={() => projectsDispatch({ type: 'detail-opened', id: openProject.id })}
        />
      )}
    </main>
  )
}
