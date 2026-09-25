import type { Project } from '../../models/project'
import type { DeployEnvVar } from '../../state/projects/projects.reducer'

export interface ProjectDetailRepositoryInfo {
  id: number
  name: string
  language: string
}

interface ProjectDetailViewProps {
  project: Project
  repositories: ProjectDetailRepositoryInfo[]
  deployPaths: Record<string, string>
  deployEnv: Record<string, DeployEnvVar[]>
  openKey: string | null
  configured: boolean
  onBack(): void
  onToggleRow(key: string): void
  onPathChange(key: string, path: string): void
  onEnvAdd(key: string): void
  onEnvRemove(key: string, index: number): void
  onEnvChange(key: string, index: number, field: 'key' | 'value', value: string): void
  onConfigure(): void
}

function shortName(name: string): string {
  const parts = name.split('/')
  return parts[parts.length - 1]
}

export function ProjectDetailView({
  project,
  repositories,
  deployPaths,
  deployEnv,
  openKey,
  configured,
  onBack,
  onToggleRow,
  onPathChange,
  onEnvAdd,
  onEnvRemove,
  onEnvChange,
  onConfigure,
}: ProjectDetailViewProps) {
  const total = repositories.length
  const readyCount = repositories.filter((repository) => (
    (deployPaths[`${project.id}:${repository.id}`] ?? '').trim().length > 0
  )).length
  const allReady = total > 0 && readyCount === total

  return (
    <>
      <header className="flex items-center gap-[14px] border-b border-[#e6eaf0] px-6 py-5 dark:border-[#253044]">
        <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold text-[#16202e] dark:text-[#e8edf6]">{project.name}</span>
          <span className="mt-0.5 block truncate text-[13px] text-[#8c98ac] dark:text-[#a7b4c8]">{project.description}</span>
        </span>
        <button
          type="button"
          onClick={onBack}
          className="h-8 shrink-0 rounded-lg border border-[#d6dce5] bg-white px-3 text-[12.5px] font-semibold text-[#51607a] hover:bg-[#f1f5f9] dark:border-[#2e3a51] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]"
        >
          ← Proyectos
        </button>
      </header>

      <div className="flex flex-col gap-6 p-5 sm:p-7">
        <div className="overflow-hidden rounded-lg border border-[#e0e6ef] dark:border-[#253044]">
          <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3 bg-[#f8fafc] px-4 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#8c98ac] dark:bg-[#0c121d] dark:text-[#7a8699]">
            <span>Repositorio</span>
            <span>Lenguaje</span>
          </div>
          {repositories.map((repository, index) => (
            <div
              key={repository.id}
              className={`grid grid-cols-[minmax(0,1fr)_120px] items-center gap-3 px-4 py-[11px] ${index === 0 ? '' : 'border-t border-[#e6eaf0] dark:border-[#253044]'}`}
            >
              <span className="truncate font-mono text-[13px] font-medium text-[#16202e] dark:text-[#e8edf6]">{shortName(repository.name)}</span>
              <span className="text-[13px] text-[#51607a] dark:text-[#a7b4c8]">{repository.language}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-[#16202e] dark:text-[#e8edf6]">Archivos de despliegue</span>
            <span className="text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]">
              Uno por repositorio. Escribe la ruta y, si aplica, sus variables de entorno.
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#e0e6ef] dark:border-[#253044]">
            {repositories.map((repository, index) => {
              const key = `${project.id}:${repository.id}`
              const path = deployPaths[key] ?? ''
              const env = deployEnv[key] ?? []
              const open = openKey === key

              return (
                <div key={repository.id} className={index === 0 ? '' : 'border-t border-[#e6eaf0] dark:border-[#253044]'}>
                  <button
                    type="button"
                    onClick={() => onToggleRow(key)}
                    className="flex w-full items-center gap-3 px-4 py-[13px] text-left transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#0c121d]"
                  >
                    <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-[#f1f5f9] text-[#51607a] dark:bg-[#1a2334] dark:text-[#a7b4c8]">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
                      </svg>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-mono text-[13.5px] font-medium text-[#16202e] dark:text-[#e8edf6]">
                        {path.trim() || 'Sin archivo de despliegue'}
                      </span>
                      <span className="truncate text-[12px] text-[#8c98ac] dark:text-[#7a8699]">{shortName(repository.name)}</span>
                    </span>
                    <span
                      className={`inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-semibold ${
                        path.trim()
                          ? 'bg-[#e6f4ec] text-[#1d7a45] dark:bg-[#12291d] dark:text-[#5fcf8f]'
                          : 'bg-[#fbefe0] text-[#a4550a] dark:bg-[#2d1f10] dark:text-[#f0a458]'
                      }`}
                    >
                      {path.trim() ? 'Listo' : 'Sin ruta'}
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`shrink-0 text-[#8c98ac] transition-transform dark:text-[#7a8699] ${open ? 'rotate-90' : ''}`}
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </button>

                  {open && (
                    <div className="flex flex-col gap-4 border-t border-[#e6eaf0] bg-[#f8fafc] px-4 py-4 pl-[58px] dark:border-[#253044] dark:bg-[#0c121d]">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12.5px] font-semibold text-[#51607a] dark:text-[#a7b4c8]">
                          Ruta del archivo de despliegue
                        </label>
                        <input
                          value={path}
                          onChange={(event) => onPathChange(key, event.target.value)}
                          placeholder="ruta/al/Dockerfile"
                          className="h-10 rounded-lg border border-[#d6dce5] bg-white px-3 font-mono text-[13px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#e8edf6]"
                        />
                        <span className="text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
                          Escribe la ruta relativa a la raíz del repositorio.
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[12px] font-bold uppercase tracking-[0.09em] text-[#51607a] dark:text-[#a7b4c8]">
                            Variables de entorno · {env.length}
                          </span>
                          <span className="h-px flex-1 bg-[#e6eaf0] dark:bg-[#253044]" />
                        </div>

                        <div className="flex flex-col gap-2">
                          {env.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex items-center gap-2">
                              <input
                                value={row.key}
                                onChange={(event) => onEnvChange(key, rowIndex, 'key', event.target.value)}
                                placeholder="NOMBRE_VARIABLE"
                                className="h-9 min-w-0 flex-1 rounded-lg border border-[#d6dce5] bg-white px-2.5 font-mono text-[12.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#e8edf6]"
                              />
                              <input
                                value={row.value}
                                onChange={(event) => onEnvChange(key, rowIndex, 'value', event.target.value)}
                                placeholder="valor"
                                className="h-9 min-w-0 flex-1 rounded-lg border border-[#d6dce5] bg-white px-2.5 text-[12.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#e8edf6]"
                              />
                              <button
                                type="button"
                                onClick={() => onEnvRemove(key, rowIndex)}
                                aria-label="Eliminar variable"
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d6dce5] bg-white text-[#8c98ac] hover:bg-[#f1f5f9] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#7a8699]"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                  <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => onEnvAdd(key)}
                          className="self-start rounded-lg border border-dashed border-[#c8d0dc] px-3 py-1.5 text-[12.5px] font-semibold text-[#51607a] hover:bg-white dark:border-[#3b4860] dark:text-[#a7b4c8] dark:hover:bg-[#111826]"
                        >
                          + Agregar variable
                        </button>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => onToggleRow(key)}
                          className="h-8 rounded-lg border border-[#d6dce5] bg-white px-3 text-[12.5px] font-semibold text-[#51607a] hover:bg-[#f1f5f9] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#c1cbe0]"
                        >
                          Listo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6eaf0] bg-[#f8fafc] px-6 py-4 dark:border-[#253044] dark:bg-[#0c121d]">
        <span className="text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]">
          {configured ? 'Configuración guardada.' : `${readyCount} de ${total} archivos con ruta capturada`}
        </span>
        <button
          type="button"
          disabled={!allReady}
          onClick={onConfigure}
          className="h-10 rounded-lg bg-[#2257c4] px-[18px] text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(34,87,196,0.35)] enabled:hover:bg-[#1c489f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Configurar despliegue →
        </button>
      </div>
    </>
  )
}
