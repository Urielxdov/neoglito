import type { Project } from '../../models/project'
import { formatRelativeTime } from '../../utils/relative-time'

function shortName(name: string): string {
  const parts = name.split('/')
  return parts[parts.length - 1]
}

interface ProjectListItemProps {
  project: Project
  onOpen(id: number): void
}

export function ProjectListItem({ project, onOpen }: ProjectListItemProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(project.id)}
      className="flex w-full flex-col gap-[10px] rounded-lg border border-[#e0e6ef] bg-white p-4 text-left transition-colors hover:border-[#c4ccd8] hover:bg-[#f8fafc] dark:border-[#253044] dark:bg-[#111826] dark:hover:border-[#3b4860] dark:hover:bg-[#0c121d]"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[14.5px] font-semibold text-[#16202e] dark:text-[#e8edf6]">{project.name}</span>
          <span className="text-pretty text-[12.5px] leading-[1.45] text-[#8c98ac] dark:text-[#7a8699]">
            {project.description}
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap text-[11.5px] text-[#a7b0bd] dark:text-[#5f6b7e]">
          Actualizado {formatRelativeTime(project.updatedAt)}
        </span>
      </span>
      <span className="flex flex-wrap gap-1.5">
        {project.repositories.map((repository) => (
          <span
            key={repository.id}
            className="rounded-md border border-[#e0e6ef] bg-[#f8fafc] px-2 py-0.5 font-mono text-[12px] text-[#51607a] dark:border-[#253044] dark:bg-[#0c121d] dark:text-[#a7b4c8]"
          >
            {shortName(repository.name)}
          </span>
        ))}
      </span>
    </button>
  )
}
