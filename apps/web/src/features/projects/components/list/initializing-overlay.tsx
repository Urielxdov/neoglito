interface InitializingOverlayProps {
  name: string
  done: number
  total: number
  label: string
}

export function InitializingOverlay({ name, done, total, label }: InitializingOverlayProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 p-6 backdrop-blur-sm dark:bg-[#0c121d]/80">
      <div className="flex w-full max-w-[320px] flex-col items-center gap-4 text-center">
        <span
          aria-hidden="true"
          className="block h-10 w-10 animate-spin rounded-full border-[3px] border-[#e0e6ef] border-t-[#2257c4] dark:border-[#253044] dark:border-t-[#5b8df5]"
        />
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-semibold text-[#16202e] dark:text-[#e8edf6]">Creando proyecto</span>
          <span className="text-[13px] text-[#8c98ac] dark:text-[#7a8699]">{name}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-[#e6eaf0] dark:bg-[#253044]">
          <div
            className="h-full rounded-full bg-[#2257c4] transition-all duration-300 dark:bg-[#5b8df5]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-[13px] font-medium text-[#394b6a] dark:text-[#c1cbe0]">{label}</span>
      </div>
    </div>
  )
}
