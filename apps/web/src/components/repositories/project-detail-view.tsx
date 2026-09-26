import type { Project } from '../../models/project'
import type {
  DeployEnvVar,
  ProjectsDetailTab,
} from '../../state/projects/projects.reducer'
import { DeployPathDrawer } from './deploy-path-drawer'

export interface ProjectDetailRepositoryInfo {
  id: number
  name: string
  language: string
}

interface ProjectDetailViewProps {
  project: Project
  repositories: ProjectDetailRepositoryInfo[]
  deployPaths: Record<string, string>
  deployPathCandidates: Record<string, string[]>
  deployEnv: Record<string, DeployEnvVar[]>
  openKey: string | null
  configured: boolean
  detailTab: ProjectsDetailTab
  onTabChange(tab: ProjectsDetailTab): void
  onBack(): void
  onToggleRow(key: string): void
  onPathChange(key: string, path: string): void
  onEnvAdd(key: string): void
  onEnvRemove(key: string, index: number): void
  onEnvChange(
    key: string,
    index: number,
    field: 'key' | 'value',
    value: string,
  ): void
  onConfigure(): void
}

function shortName (name: string): string {
  const parts = name.split('/')
  return parts[parts.length - 1]
}

export function ProjectDetailView ({
  project,
  repositories,
  deployPaths,
  deployPathCandidates,
  deployEnv,
  openKey,
  configured,
  detailTab,
  onTabChange,
  onBack,
  onToggleRow,
  onPathChange,
  onEnvAdd,
  onEnvRemove,
  onEnvChange,
  onConfigure,
}: ProjectDetailViewProps) {
  const total = repositories.length
  const readyCount = repositories.filter(
    repository =>
      (deployPaths[`${project.id}:${repository.id}`] ?? '').trim().length > 0,
  ).length
  const allReady = total > 0 && readyCount === total

  const openRepository = openKey
    ? repositories.find(
        repository => `${project.id}:${repository.id}` === openKey,
      )
    : undefined

  const tabs: Array<{ key: ProjectsDetailTab; label: string; count: string }> = [
    { key: 'deploy', label: 'Despliegue', count: `${readyCount}/${total}` },
    { key: 'routes', label: 'Rutas API', count: '0' },
    { key: 'repos', label: 'Repositorios', count: `${total}` },
  ]

  return (
    <>
      <header className='flex items-center gap-[14px] border-b border-[#e6eaf0] px-6 py-5 dark:border-[#253044]'>
        <span className='grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]'>
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' />
          </svg>
        </span>
        <span className='min-w-0 flex-1'>
          <span className='block truncate text-[17px] font-semibold text-[#16202e] dark:text-[#e8edf6]'>
            {project.name}
          </span>
          <span className='mt-0.5 block truncate text-[13px] text-[#8c98ac] dark:text-[#a7b4c8]'>
            {project.description}
          </span>
        </span>
        <span className='flex shrink-0 items-center gap-2.5'>
          <span className='inline-flex h-6 items-center whitespace-nowrap rounded-full bg-[#e6f4ec] px-2.5 text-[12px] font-semibold text-[#1d7a45] dark:bg-[#12291d] dark:text-[#5fcf8f]'>
            Clonado
          </span>
          <button
            type='button'
            onClick={onBack}
            className='h-8 shrink-0 rounded-lg border border-[#d6dce5] bg-white px-3 text-[12.5px] font-semibold text-[#51607a] hover:bg-[#f1f5f9] dark:border-[#2e3a51] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]'
          >
            ← Proyectos
          </button>
        </span>
      </header>

      <div className='flex flex-col gap-[22px] p-5 sm:p-7'>
        <div className='inline-flex w-fit max-w-full gap-1 overflow-x-auto rounded-[10px] border border-[#e6eaf0] bg-[#f8fafc] p-1 dark:border-[#253044] dark:bg-[#0c121d]'>
          {tabs.map(tab => (
            <button
              key={tab.key}
              type='button'
              onClick={() => onTabChange(tab.key)}
              className={`flex h-[34px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[7px] px-[14px] text-[13px] font-semibold transition-colors ${
                detailTab === tab.key
                  ? 'bg-white text-[#16202e] shadow-[0_1px_2px_rgba(20,32,46,0.05),0_1px_1px_rgba(20,32,46,0.04)] dark:bg-[#111826] dark:text-[#e8edf6]'
                  : 'text-[#8c98ac] hover:text-[#51607a] dark:text-[#7a8699] dark:hover:text-[#a7b4c8]'
              }`}
            >
              <span>{tab.label}</span>
              <span className='text-[11.5px] font-semibold text-[#8c98ac] dark:text-[#7a8699]'>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {detailTab === 'deploy' && (
          <div className='flex flex-col gap-4'>
            <span className='text-[13px] leading-[1.5] text-[#8c98ac] dark:text-[#7a8699]'>
              Cada repositorio usa un archivo de despliegue. Ábrelo para
              confirmar la ruta y llenar sus variables de entorno.
            </span>

            <div className='overflow-hidden rounded-lg border border-[#e0e6ef] dark:border-[#253044]'>
              {repositories.map((repository, index) => {
                const key = `${project.id}:${repository.id}`
                const path = deployPaths[key] ?? ''

                return (
                  <button
                    key={repository.id}
                    type='button'
                    onClick={() => onToggleRow(key)}
                    className={`flex w-full items-center gap-3 px-4 py-[13px] text-left transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#0c121d] ${
                      index === 0
                        ? ''
                        : 'border-t border-[#e6eaf0] dark:border-[#253044]'
                    }`}
                  >
                    <span className='grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-[#f1f5f9] text-[#51607a] dark:bg-[#1a2334] dark:text-[#a7b4c8]'>
                      <svg
                        width='15'
                        height='15'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      >
                        <path d='m8 7-5 5 5 5M16 7l5 5-5 5' />
                      </svg>
                    </span>
                    <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                      <span className='truncate font-mono text-[13.5px] font-medium text-[#16202e] dark:text-[#e8edf6]'>
                        {path.trim() || 'Sin archivo de despliegue'}
                      </span>
                      <span className='truncate text-[12px] text-[#8c98ac] dark:text-[#7a8699]'>
                        {shortName(repository.name)}
                      </span>
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
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='shrink-0 text-[#8c98ac] dark:text-[#7a8699]'
                    >
                      <path d='m9 6 6 6-6 6' />
                    </svg>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {detailTab === 'routes' && (
          <div className='flex flex-col gap-4'>
            <span className='text-[13px] leading-[1.5] text-[#8c98ac] dark:text-[#7a8699]'>
              Archivos OpenAPI o Swagger detectados en cada repositorio.
            </span>
            <div className='flex flex-col gap-2.5'>
              {repositories.map(repository => (
                <div
                  key={repository.id}
                  className='flex items-center gap-[14px] rounded-lg border border-[#e0e6ef] bg-white px-4 py-[13px] dark:border-[#253044] dark:bg-[#111826]'
                >
                  <span className='flex min-w-0 flex-1 flex-col gap-1'>
                    <span className='truncate text-[14px] font-semibold text-[#16202e] dark:text-[#e8edf6]'>
                      {shortName(repository.name)}
                    </span>
                    <span className='truncate text-[12.5px] text-[#aab3c2] dark:text-[#5f6b7e]'>
                      Sin especificación detectada
                    </span>
                  </span>
                  <span className='inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full bg-[#f1f5f9] px-2.5 text-[11.5px] font-semibold text-[#8c98ac] dark:bg-[#1a2334] dark:text-[#7a8699]'>
                    No encontrado
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {detailTab === 'repos' && (
          <div className='overflow-hidden rounded-lg border border-[#e0e6ef] dark:border-[#253044]'>
            <div className='grid grid-cols-[minmax(0,1fr)_120px_74px] gap-3 bg-[#f8fafc] px-4 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#8c98ac] dark:bg-[#0c121d] dark:text-[#7a8699]'>
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
                <span className='truncate font-mono text-[13px] font-medium text-[#16202e] dark:text-[#e8edf6]'>
                  {shortName(repository.name)}
                </span>
                <span className='text-[13px] text-[#51607a] dark:text-[#a7b4c8]'>
                  {repository.language}
                </span>
                <span>
                  <span className='inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full bg-[#e6f4ec] px-2.5 text-[11.5px] font-semibold text-[#1d7a45] dark:bg-[#12291d] dark:text-[#5fcf8f]'>
                    Listo
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='flex flex-wrap items-center justify-between gap-3 border-t border-[#e6eaf0] bg-[#f8fafc] px-6 py-4 dark:border-[#253044] dark:bg-[#0c121d]'>
        <span className='text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]'>
          {configured
            ? 'Configuración guardada.'
            : `${readyCount} de ${total} archivos con ruta capturada`}
        </span>
        <button
          type='button'
          disabled={!allReady}
          onClick={onConfigure}
          className='h-10 rounded-lg bg-[#2257c4] px-[18px] text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(34,87,196,0.35)] enabled:hover:bg-[#1c489f] disabled:cursor-not-allowed disabled:opacity-50'
        >
          Configurar despliegue →
        </button>
      </div>

      {openKey && openRepository && (
        <DeployPathDrawer
          repositoryName={shortName(openRepository.name)}
          path={deployPaths[openKey] ?? ''}
          candidates={deployPathCandidates[openKey] ?? []}
          env={deployEnv[openKey] ?? []}
          statusLabel={(deployPaths[openKey] ?? '').trim() ? 'Listo' : 'Sin ruta'}
          ready={Boolean((deployPaths[openKey] ?? '').trim())}
          onClose={() => onToggleRow(openKey)}
          onPathChange={path => onPathChange(openKey, path)}
          onEnvAdd={() => onEnvAdd(openKey)}
          onEnvRemove={index => onEnvRemove(openKey, index)}
          onEnvChange={(index, field, value) =>
            onEnvChange(openKey, index, field, value)
          }
        />
      )}
    </>
  )
}
