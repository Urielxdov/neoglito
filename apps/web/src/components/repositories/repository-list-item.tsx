export interface GitHubRepository {
  id: number
  name: string
  description: string
  visibility: 'Privado' | 'Público'
  language: string
  updatedAt: string
}

interface RepositoryListItemProps {
  repository: GitHubRepository
  selected: boolean
  onSelectionChange(id: number): void
}

export function RepositoryListItem({
  repository,
  selected,
  onSelectionChange,
}: RepositoryListItemProps) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 border-b border-[#e6eaf0] px-4 py-[13px] transition-colors last:border-b-0 dark:border-[#253044] ${
        selected
          ? 'bg-[#eef3fc] dark:bg-[#18243a]'
          : 'hover:bg-[#f8fafc] dark:hover:bg-[#0c121d]'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onSelectionChange(repository.id)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[5px] border transition-colors ${
          selected
            ? 'border-[#2257c4] bg-[#2257c4] dark:border-[#5b8df5] dark:bg-[#5b8df5]'
            : 'border-[#c4ccd8] bg-white dark:border-[#3b4860] dark:bg-[#1a2334]'
        }`}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-white transition-opacity ${selected ? 'opacity-100' : 'opacity-0'}`}
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-mono text-[13.5px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
            {repository.name}
          </span>
          <span className="shrink-0 rounded-full border border-[#e0e6ef] px-2 py-[1px] text-[11px] font-semibold text-[#8c98ac] dark:border-[#35435a] dark:text-[#a7b4c8]">
            {repository.visibility}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-[#8c98ac] dark:text-[#a7b4c8]">
          {repository.description}
        </span>
        <span className="mt-1 flex items-center gap-2 text-[11.5px] sm:hidden">
          <span className="font-semibold text-[#394b6a] dark:text-[#c1cbe0]">{repository.language}</span>
          <span className="text-[#8c98ac] dark:text-[#7a8699]" aria-hidden="true">·</span>
          <span className="text-[#8c98ac] dark:text-[#7a8699]">{repository.updatedAt}</span>
        </span>
      </span>

      <span className="hidden shrink-0 flex-col items-end gap-1 text-[11.5px] sm:flex">
        <span className="font-semibold text-[#394b6a] dark:text-[#c1cbe0]">{repository.language}</span>
        <span className="text-[#8c98ac] dark:text-[#7a8699]">{repository.updatedAt}</span>
      </span>
    </label>
  )
}
