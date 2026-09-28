import {
  Check,
  CircleAlert,
  GitBranch,
  Info,
  LoaderCircle,
  LockKeyhole,
  Moon,
  Sun,
} from 'lucide'
import { AppIcon } from "@neoglito/web/components/ui/app-icon"

export type ThemeMode = 'light' | 'dark'
export type GithubAccount = { user: string; repos?: number }
export type StatusKind = 'ok' | 'err' | 'wait'
export type Status = { kind: StatusKind; title: string; text: string }

interface GitHubConnectionPanelProps {
  theme: ThemeMode
  account: GithubAccount | null
  status: Status | null
  onThemeChange(theme: ThemeMode): void
  onGithub(): void
  onCancel(): void
  onPrimary(): void
}

const STATUS_ICON = { ok: Check, err: CircleAlert, wait: LoaderCircle }

const STATUS_TONE: Record<StatusKind, string> = {
  ok: 'text-[#2257c4] dark:text-[#5b8df5]',
  err: 'text-[#c2453b] dark:text-[#e07a70]',
  wait: '',
}

const btnBase =
  'inline-flex items-center gap-2 h-10 px-[18px] rounded-lg text-[13.5px] font-semibold border transition-colors cursor-pointer whitespace-nowrap'
const btnGhost =
  'bg-white dark:bg-[#111826] border-[#d6dce5] dark:border-[#2e3a51] text-[#51607a] dark:text-[#a7b4c8] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2334] hover:text-[#16202e] dark:hover:text-[#e8edf6]'
const btnPrimary =
  'border-transparent bg-[#2257c4] dark:bg-[#5b8df5] text-white dark:text-[#0b1220] shadow-[0_1px_2px_rgba(34,87,196,0.35)] hover:bg-[#1c489f] dark:hover:bg-[#7aa4ff] active:translate-y-px'

function GitHubConnectionPanel({
  theme,
  account,
  status,
  onThemeChange,
  onGithub,
  onCancel,
  onPrimary,
}: GitHubConnectionPanelProps) {
  const dark = theme === 'dark'

  return (
    <div
      data-theme={theme}
      className="min-h-screen flex flex-col items-center gap-[22px] px-6 pt-14 pb-20 box-border font-sans bg-[#f8fafc] dark:bg-[#0c121d] text-[#16202e] dark:text-[#e8edf6]"
    >
      <div className="w-full max-w-[560px] flex items-center justify-between gap-4">
        <div className="text-[13px] font-semibold tracking-[0.09em] uppercase text-[#8c98ac] dark:text-[#7a8699]">
          Repositorios
        </div>
        <button
          type="button"
          onClick={() => onThemeChange(dark ? 'light' : 'dark')}
          className={`${btnBase} ${btnGhost} h-[34px] px-[13px] text-[12.5px] gap-[7px]`}
        >
          <AppIcon icon={dark ? Sun : Moon} size={15} />
          <span>{dark ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
      </div>

      <div className="relative flex flex-col w-full max-w-[560px] rounded-2xl bg-white dark:bg-[#111826] shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7),0_8px_22px_-12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-[14px] px-6 py-5 border-b border-[#e6eaf0] dark:border-[#253044] shrink-0">
          <div className="w-[42px] h-[42px] rounded-[11px] grid place-items-center shrink-0 bg-[#eef3fc] dark:bg-[#18243a] text-[#2257c4] dark:text-[#5b8df5]">
            <AppIcon icon={GitBranch} size={20} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-semibold tracking-[-0.01em] text-[#16202e] dark:text-[#e8edf6]">
              Sincronizar con GitHub
            </div>
            <div className="text-[13px] mt-[1px] text-[#8c98ac] dark:text-[#7a8699]">
              Conecta la cuenta que aloja tus repositorios.
            </div>
          </div>
        </div>

        <div className="px-7 pt-[26px] pb-7">
          <div className="flex flex-col gap-[18px]">
            <div className="flex flex-col items-center text-center gap-[14px] px-[22px] py-7 rounded-[10px] border border-[#e6eaf0] dark:border-[#253044] bg-white dark:bg-[#111826]">
              <span className="w-[52px] h-[52px] rounded-[14px] grid place-items-center bg-[#f1f5f9] dark:bg-[#1a2334] text-[#16202e] dark:text-[#e8edf6]">
                <AppIcon icon={GitBranch} size={28} />
              </span>
              <span className="flex flex-col gap-[5px] max-w-[360px]">
                <span className="text-[15.5px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
                  {account ? `Conectado como @${account.user}` : 'Conecta tu cuenta de GitHub'}
                </span>
                <span className="text-[13px] leading-[1.5] text-[#8c98ac] dark:text-[#7a8699]">
                  {account
                    ? account.repos === undefined
                      ? 'Tu cuenta esta lista para elegir los repositorios que deseas sincronizar.'
                      : `Encontramos ${account.repos} repositorios. Elegiras cuales sincronizar en el siguiente paso.`
                    : 'Te llevaremos a GitHub para autorizar el acceso y vincular tus repositorios.'}
                </span>
              </span>
              <button
                type="button"
                onClick={onGithub}
                className="inline-flex items-center justify-center gap-[10px] h-11 px-[22px] rounded-lg text-[13.5px] font-semibold cursor-pointer transition-opacity bg-[#16202e] dark:bg-[#e8edf6] text-white dark:text-[#111826] border border-[#16202e] dark:border-[#e8edf6] hover:opacity-[0.88]"
              >
                {account ? 'Usar otra cuenta' : 'Continuar con GitHub'}
              </button>
            </div>

            <div className="flex items-start gap-[11px] px-[15px] py-[13px] rounded-lg text-[13px] leading-[1.45] bg-[#f8fafc] dark:bg-[#0c121d] border border-[#e6eaf0] dark:border-[#253044] text-[#51607a] dark:text-[#a7b4c8]">
              <span className="flex shrink-0 mt-[1px] text-[#8c98ac] dark:text-[#7a8699]">
                <AppIcon icon={Info} size={15} strokeWidth={1.8} />
              </span>
              <span>Pedimos permiso de lectura sobre repositorios y webhooks para detectar nuevos commits. Puedes revocarlo cuando quieras desde GitHub.</span>
            </div>

            {status && (
              <div className="flex items-center gap-[11px] px-[15px] py-[13px] rounded-lg text-[13px] leading-[1.45] bg-[#f8fafc] dark:bg-[#0c121d] border border-[#e6eaf0] dark:border-[#253044] text-[#51607a] dark:text-[#a7b4c8]">
                <span className={`flex shrink-0 ${STATUS_TONE[status.kind] || 'text-[#8c98ac] dark:text-[#7a8699]'}`}>
                  <AppIcon icon={STATUS_ICON[status.kind]} size={15} />
                </span>
                <span>
                  <span className={`font-bold ${STATUS_TONE[status.kind] || 'text-[#16202e] dark:text-[#e8edf6]'}`}>
                    {status.title}
                  </span>{' '}
                  {status.text}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 rounded-b-2xl flex-wrap sm:flex-nowrap shrink-0 border-t border-[#e6eaf0] dark:border-[#253044] bg-[#f8fafc] dark:bg-[#0c121d]">
          <div className="flex items-center gap-[7px] text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]">
            <AppIcon icon={LockKeyhole} size={13} strokeWidth={1.8} />
            <span>Tus credenciales se cifran en reposo.</span>
          </div>
          <div className="flex gap-[10px] ml-0 sm:ml-auto">
            <button type="button" onClick={onCancel} className={`${btnBase} ${btnGhost}`}>
              Cancelar
            </button>
            <button type="button" onClick={onPrimary} className={`${btnBase} ${btnPrimary}`}>
              Finalizar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GitHubConnectionPanel
