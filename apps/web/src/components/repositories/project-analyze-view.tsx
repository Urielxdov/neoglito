import type { Project } from "@neoglito/web/models/project"
import type { ProjectDetailRepositoryInfo } from "@neoglito/web/components/repositories/project-detail-view"
import type { AnalyzeState } from "@neoglito/web/state/projects/projects.reducer"
import { formatRelativeTime } from "@neoglito/web/utils/relative-time"
import { AnalyzeRepoGroup } from "@neoglito/web/components/repositories/analyze-repo-group"
import { serviceTone } from "@neoglito/web/components/repositories/analyze-service-tone"

function shortName(name: string): string {
  const parts = name.split('/')
  return parts[parts.length - 1]
}

interface ProjectAnalyzeViewProps {
  project: Project
  repositories: ProjectDetailRepositoryInfo[]
  analyze: AnalyzeState
  onBack(): void
  onToggleGroup(repositoryId: number): void
  onSelectService(key: string): void
}

export function ProjectAnalyzeView({
  project,
  repositories,
  analyze,
  onBack,
  onToggleGroup,
  onSelectService,
}: ProjectAnalyzeViewProps) {
  const total = analyze.repos.length
  const settled = analyze.repos.filter((repo) => repo.status !== 'pending').length
  const failed = analyze.repos.filter((repo) => repo.status === 'failed').length
  const pct = total > 0 ? Math.round((settled / total) * 100) : 0
  const done = settled === total

  const stateLabel = !done ? 'Analizando' : failed > 0 ? 'Con errores' : 'Listo'
  const stateFg = !done
    ? 'text-[#2257c4] dark:text-[#5b8df5]'
    : failed > 0
      ? 'text-[#a4550a] dark:text-[#f0a458]'
      : 'text-[#1d7a45] dark:text-[#5fcf8f]'
  const stateBg = !done
    ? 'bg-[#eef3fc] dark:bg-[#18243a]'
    : failed > 0
      ? 'bg-[#fbefe0] dark:bg-[#2d1f10]'
      : 'bg-[#e6f4ec] dark:bg-[#12291d]'

  const selectedKey =
    analyze.selectedKey ??
    (() => {
      const firstSucceeded = analyze.repos.find(
        (repo) => repo.status === 'succeeded' && (repo.deployment?.services.length ?? 0) > 0,
      )
      return firstSucceeded ? `${firstSucceeded.repositoryId}:0` : null
    })()

  const [selectedRepositoryIdRaw, selectedServiceIndexRaw] = selectedKey?.split(':') ?? []
  const selectedRepositoryId = selectedRepositoryIdRaw ? Number(selectedRepositoryIdRaw) : null
  const selectedServiceIndex = selectedServiceIndexRaw ? Number(selectedServiceIndexRaw) : null
  const selectedAnalyzeRepo = analyze.repos.find(
    (repo) => repo.repositoryId === selectedRepositoryId,
  )
  const selectedRepository = repositories.find(
    (repository) => repository.id === selectedRepositoryId,
  )
  const selectedService =
    selectedAnalyzeRepo?.deployment && selectedServiceIndex !== null
      ? selectedAnalyzeRepo.deployment.services[selectedServiceIndex]
      : undefined

  return (
    <div className="mx-auto mt-[22px] flex min-h-0 w-full max-w-[1200px] flex-1 flex-col gap-[18px]">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e6eaf0] bg-white px-[22px] py-[18px] shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:border-[#253044] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
        <button
          type="button"
          onClick={onBack}
          className="h-[34px] shrink-0 rounded-lg border border-[#d6dce5] bg-white px-3 text-[12.5px] font-semibold text-[#51607a] hover:bg-[#f1f5f9] dark:border-[#2e3a51] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]"
        >
          ← Configuración
        </button>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
            {project.name}
          </span>
          <span className="text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]">
            {done
              ? 'Todos los despliegues finalizaron.'
              : `Desplegando · ${settled} de ${total} repositorios listos`}
          </span>
        </span>
        <div className="h-1 min-w-[140px] flex-[0_1_220px] overflow-hidden rounded-full bg-[#e6eaf0] dark:bg-[#253044]">
          <div
            className="h-full rounded-full bg-[#2257c4] transition-all duration-500 dark:bg-[#5b8df5]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className={`inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-semibold ${stateFg} ${stateBg}`}
        >
          {stateLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-wrap items-start gap-[18px]">
        <aside className="max-w-[320px] min-w-0 flex-1 basis-[260px] overflow-hidden rounded-2xl border border-[#e6eaf0] bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:border-[#253044] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between gap-2.5 border-b border-[#e6eaf0] px-[18px] py-3.5 dark:border-[#253044]">
            <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8c98ac] dark:text-[#7a8699]">
              Repositorios
            </span>
            <span className="text-[12px] text-[#8c98ac] dark:text-[#7a8699]">{total}</span>
          </div>
          {analyze.repos.map((repo, index) => {
            const repository = repositories.find((r) => r.id === repo.repositoryId)
            const services =
              repo.deployment?.services.map((service, serviceIndex) => ({
                key: `${repo.repositoryId}:${serviceIndex}`,
                name: service.composeServiceName,
                status: service.status,
                health: service.health,
              })) ?? []

            return (
              <AnalyzeRepoGroup
                key={repo.repositoryId}
                repositoryName={repository ? shortName(repository.name) : `#${repo.repositoryId}`}
                status={repo.status}
                message={repo.message}
                services={services}
                collapsed={Boolean(analyze.collapsed[repo.repositoryId])}
                selectedKey={selectedKey}
                isFirst={index === 0}
                onToggleCollapse={() => onToggleGroup(repo.repositoryId)}
                onSelectService={onSelectService}
              />
            )
          })}
        </aside>

        <section className="min-w-0 flex-[1_1_420px] overflow-hidden rounded-2xl border border-[#e6eaf0] bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:border-[#253044] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
          {selectedService && selectedRepository && selectedAnalyzeRepo?.deployment ? (
            <>
              <div className="flex flex-wrap items-center gap-3.5 border-b border-[#e6eaf0] px-[22px] py-[18px] dark:border-[#253044]">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15.5px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
                    {selectedService.composeServiceName}
                  </span>
                  <span className="block font-mono text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
                    {shortName(selectedRepository.name)}
                  </span>
                </span>
                <span
                  className={`inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-semibold ${serviceTone(selectedService.status, selectedService.health).textClassName} ${serviceTone(selectedService.status, selectedService.health).bgClassName}`}
                >
                  {serviceTone(selectedService.status, selectedService.health).label}
                </span>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-px border-b border-[#e6eaf0] bg-[#e6eaf0] dark:border-[#253044] dark:bg-[#253044]">
                {[
                  { k: 'Estado', v: selectedService.status },
                  { k: 'Salud', v: selectedService.health },
                  { k: 'Archivo', v: selectedAnalyzeRepo.deployment.composePath },
                  {
                    k: 'Observado',
                    v: formatRelativeTime(new Date(selectedService.lastObservedAt)),
                  },
                ].map((fact) => (
                  <div
                    key={fact.k}
                    className="flex flex-col gap-1 bg-white px-[22px] py-3.5 dark:bg-[#111826]"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a7b0bd] dark:text-[#5f6b7e]">
                      {fact.k}
                    </span>
                    <span className="truncate font-mono text-[13px] text-[#16202e] dark:text-[#e8edf6]">
                      {fact.v}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2.5 px-[22px] py-[18px]">
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#8c98ac] dark:text-[#7a8699]">
                  Servicios de {shortName(selectedRepository.name)}
                </span>
                <div className="flex flex-col gap-1.5 rounded-lg border border-[#e0e6ef] p-2 font-mono text-[12.5px] dark:border-[#253044]">
                  {selectedAnalyzeRepo.deployment.services.map((service, serviceIndex) => {
                    const tone = serviceTone(service.status, service.health)
                    const key = `${selectedAnalyzeRepo.repositoryId}:${serviceIndex}`

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onSelectService(key)}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#0c121d] ${
                          key === selectedKey ? 'bg-[#f8fafc] dark:bg-[#0c121d]' : ''
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`block h-[7px] w-[7px] shrink-0 rounded-full ${tone.dotClassName}`}
                        />
                        <span className="text-[#16202e] dark:text-[#e8edf6]">
                          {service.composeServiceName}
                        </span>
                        <span className={`ml-auto ${tone.textClassName}`}>{tone.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[220px] items-center justify-center px-6 py-10 text-center text-[13px] text-[#8c98ac] dark:text-[#7a8699]">
              {done && failed === total
                ? 'Ningún servicio pudo desplegarse.'
                : 'Selecciona un servicio para ver su estado.'}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
