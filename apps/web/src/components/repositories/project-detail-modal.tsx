import type { Project } from '../../models/project'
import { formatDate, formatRelativeTime } from '../../utils/relative-time'

export interface ProjectDetailRepository {
  id: number
  full: string
  description: string
  language: string
  visibility: string
  shared: string
}

interface ProjectDetailModalProps {
  project: Project
  repositories: ProjectDetailRepository[]
  onClose(): void
}

export function ProjectDetailModal({ project, repositories, onClose }: ProjectDetailModalProps) {
  const count = repositories.length
  const countLabel = count === 1 ? '1 repositorio involucrado' : `${count} repositorios involucrados`

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#080c14]/50 p-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-[600px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
      >
        <header className="flex items-center gap-[14px] border-b border-[#e6eaf0] px-6 py-5 dark:border-[#253044]">
          <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[11px] bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-semibold text-[#16202e] dark:text-[#e8edf6]">{project.name}</span>
            <span className="mt-0.5 block truncate text-[13px] text-[#8c98ac] dark:text-[#7a8699]">{project.description}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg border border-[#d6dce5] bg-white text-[#51607a] hover:bg-[#f1f5f9] dark:border-[#2e3a51] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex flex-col gap-3 px-6 py-5 sm:px-7">
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#8c98ac] dark:text-[#7a8699]">
            {countLabel}
          </span>

          <div className="overflow-hidden rounded-lg border border-[#e0e6ef] dark:border-[#253044]">
            {repositories.map((repository, index) => (
              <div
                key={repository.id}
                className={`flex items-center gap-[14px] px-4 py-[13px] ${index === 0 ? '' : 'border-t border-[#e6eaf0] dark:border-[#253044]'}`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-mono text-[13.5px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
                      {repository.full}
                    </span>
                    <span className="shrink-0 rounded-full border border-[#e0e6ef] px-2 py-[1px] text-[11px] font-semibold text-[#8c98ac] dark:border-[#35435a] dark:text-[#a7b4c8]">
                      {repository.visibility}
                    </span>
                  </span>
                  <span className="truncate text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]">{repository.description}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-[3px] text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
                  <span className="font-semibold text-[#394b6a] dark:text-[#c1cbe0]">{repository.language}</span>
                  <span>{repository.shared}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6eaf0] bg-[#f8fafc] px-6 py-4 dark:border-[#253044] dark:bg-[#0c121d]">
          <span className="text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]">
            Creado {formatDate(project.createdAt)} · actualizado {formatRelativeTime(project.updatedAt)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg bg-[#2257c4] px-[18px] text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(34,87,196,0.35)] hover:bg-[#1c489f]"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  )
}
