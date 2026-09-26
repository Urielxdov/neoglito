import { Code, X } from 'lucide'
import type { DeployEnvVar } from "@neoglito/web/state/projects/projects.reducer"
import { AppIcon } from "@neoglito/web/components/ui/app-icon"

interface DeployPathDrawerProps {
  repositoryName: string
  path: string
  candidates: string[]
  env: DeployEnvVar[]
  statusLabel: string
  ready: boolean
  onClose(): void
  onPathChange(path: string): void
  onEnvAdd(): void
  onEnvRemove(index: number): void
  onEnvChange(index: number, field: 'key' | 'value', value: string): void
}

export function DeployPathDrawer({
  repositoryName,
  path,
  candidates,
  env,
  statusLabel,
  ready,
  onClose,
  onPathChange,
  onEnvAdd,
  onEnvRemove,
  onEnvChange,
}: DeployPathDrawerProps) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex justify-end bg-[#080c14]/42"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-[480px] flex-col border-l border-[#e6eaf0] bg-white shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:border-[#253044] dark:bg-[#111826] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center gap-[14px] border-b border-[#e6eaf0] px-7 py-[22px] dark:border-[#253044]">
          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]">
            <AppIcon icon={Code} size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
              {repositoryName}
            </span>
            <span className="mt-0.5 block text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]">
              Archivo de despliegue
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg border border-[#d6dce5] bg-white text-[#51607a] hover:bg-[#f1f5f9] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]"
          >
            <AppIcon icon={X} size={14} strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-[30px] overflow-y-auto px-7 py-[26px]">
          <div className="flex flex-col gap-2.5">
            <span className="text-[12px] font-bold uppercase tracking-[0.09em] text-[#51607a] dark:text-[#a7b4c8]">
              Ruta
            </span>
            <input
              value={path}
              onChange={(event) => onPathChange(event.target.value)}
              placeholder="ruta/al/Dockerfile"
              className="h-10 rounded-lg border border-[#d6dce5] bg-white px-3 font-mono text-[13px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#e8edf6]"
            />
            <span className="text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
              {candidates.length > 1
                ? 'Hay varios archivos; elige uno o escribe otra ruta.'
                : candidates.length === 0
                  ? 'Escribe la ruta relativa a la raíz del repositorio.'
                  : 'Ruta relativa a la raíz del repositorio. Puedes cambiarla.'}
            </span>
            {candidates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {candidates.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => onPathChange(candidate)}
                    className={`rounded-md border px-2.5 py-[5px] font-mono text-[12px] ${
                      candidate === path
                        ? 'border-[#2257c4] bg-[#eef3fc] text-[#2257c4] dark:border-[#5b8df5] dark:bg-[#18243a] dark:text-[#5b8df5]'
                        : 'border-[#d6dce5] bg-white text-[#51607a] hover:bg-[#f8fafc] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]'
                    }`}
                  >
                    {candidate}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
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
                    onChange={(event) =>
                      onEnvChange(rowIndex, 'key', event.target.value)
                    }
                    placeholder="NOMBRE_VARIABLE"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-[#d6dce5] bg-white px-2.5 font-mono text-[12.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#e8edf6]"
                  />
                  <input
                    value={row.value}
                    onChange={(event) =>
                      onEnvChange(rowIndex, 'value', event.target.value)
                    }
                    placeholder="valor"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-[#d6dce5] bg-white px-2.5 text-[12.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#e8edf6]"
                  />
                  <button
                    type="button"
                    onClick={() => onEnvRemove(rowIndex)}
                    aria-label="Eliminar variable"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d6dce5] bg-white text-[#8c98ac] hover:bg-[#f1f5f9] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#7a8699]"
                  >
                    <AppIcon icon={X} size={13} strokeWidth={2.2} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onEnvAdd}
              className="self-start rounded-lg border border-dashed border-[#c8d0dc] px-3 py-1.5 text-[12.5px] font-semibold text-[#51607a] hover:bg-[#f8fafc] dark:border-[#3b4860] dark:text-[#a7b4c8] dark:hover:bg-[#0c121d]"
            >
              + Agregar variable
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#e6eaf0] bg-[#f8fafc] px-7 py-4 dark:border-[#253044] dark:bg-[#0c121d]">
          <span
            className={`inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-semibold ${
              ready
                ? 'bg-[#e6f4ec] text-[#1d7a45] dark:bg-[#12291d] dark:text-[#5fcf8f]'
                : 'bg-[#fbefe0] text-[#a4550a] dark:bg-[#2d1f10] dark:text-[#f0a458]'
            }`}
          >
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg bg-[#2257c4] px-[18px] text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(34,87,196,0.35)] hover:bg-[#1c489f]"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
