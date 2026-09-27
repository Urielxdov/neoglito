import { Code } from 'lucide'
import { AppIcon } from "@neoglito/web/components/ui/app-icon"

interface DeployFileListItemProps {
  repositoryName: string
  fileName: string
  statusLabel: string
  ready: boolean
  selected: boolean
  onSelect(): void
}

export function DeployFileListItem({
  repositoryName,
  fileName,
  statusLabel,
  ready,
  selected,
  onSelect,
}: DeployFileListItemProps) {
  return (
    <button
      type='button'
      onClick={onSelect}
      className={`flex w-full flex-col gap-1.5 rounded-lg border px-3.5 py-3 text-left transition-colors ${
        selected
          ? 'border-[#2257c4] bg-[#eef3fc] dark:border-[#5b8df5] dark:bg-[#18243a]'
          : 'border-[#e0e6ef] bg-white hover:border-[#c4ccd8] dark:border-[#253044] dark:bg-[#111826] dark:hover:border-[#3b4860]'
      }`}
    >
      <span className='flex items-center justify-between gap-2'>
        <span className='flex min-w-0 items-center gap-1.5'>
          <AppIcon
            icon={Code}
            size={13}
            className='shrink-0 text-[#8c98ac] dark:text-[#7a8699]'
          />
          <span className='truncate text-[13.5px] font-semibold text-[#16202e] dark:text-[#e8edf6]'>
            {repositoryName}
          </span>
        </span>
        <span
          className={`inline-flex h-[20px] shrink-0 items-center whitespace-nowrap rounded-full px-2 text-[11px] font-semibold ${
            ready
              ? 'bg-[#e6f4ec] text-[#1d7a45] dark:bg-[#12291d] dark:text-[#5fcf8f]'
              : 'bg-[#fbefe0] text-[#a4550a] dark:bg-[#2d1f10] dark:text-[#f0a458]'
          }`}
        >
          {statusLabel}
        </span>
      </span>
      <span className='truncate font-mono text-[12px] text-[#8c98ac] dark:text-[#7a8699]'>
        {fileName}
      </span>
    </button>
  )
}
