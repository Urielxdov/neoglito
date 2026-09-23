import { useState } from 'react'
import { authService } from '../services/auth.service'

type ThemeMode = 'light' | 'dark'
type GithubAccount = { user: string; repos: number }
type StatusKind = 'ok' | 'err' | 'wait'
type Status = { kind: StatusKind; title: string; text: string }

const STATUS_ICON: Record<StatusKind, string> = { ok: '✓', err: '!', wait: '…' }

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

function RegistrarProyectoGit() {
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [gh, setGh] = useState<GithubAccount | null>(null)
  const [status, setStatus] = useState<Status | null>(null)

  const dark = theme === 'dark'

  const handleGithub = () => {
    setStatus({ kind: 'wait', title: 'Redirigiendo a GitHub…', text: 'Autoriza la aplicación para continuar.' })
    authService.connectWithGitHub()
  }

  const handleCancel = () => {
    setGh(null)
    setStatus(null)
  }

  const handlePrimary = () => {
    if (!gh) {
      setStatus({ kind: 'err', title: 'Falta GitHub.', text: 'Conecta la cuenta para habilitar la sincronización.' })
      return
    }
    setStatus({ kind: 'ok', title: 'Sincronización activa.', text: 'Comenzamos la primera sincronización de tus repositorios.' })
  }

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
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          className={`${btnBase} ${btnGhost} h-[34px] px-[13px] text-[12.5px] gap-[7px]`}
        >
          <span>{dark ? '☀' : '☾'}</span>
          <span>{dark ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
      </div>

      <div className="relative flex flex-col w-full max-w-[560px] rounded-2xl bg-white dark:bg-[#111826] shadow-[0_24px_60px_-20px_rgba(15,30,55,0.45),0_8px_22px_-12px_rgba(15,30,55,0.25)] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7),0_8px_22px_-12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-[14px] px-6 py-5 border-b border-[#e6eaf0] dark:border-[#253044] shrink-0">
          <div className="w-[42px] h-[42px] rounded-[11px] grid place-items-center shrink-0 bg-[#eef3fc] dark:bg-[#18243a] text-[#2257c4] dark:text-[#5b8df5]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="18" r="3"></circle>
              <circle cx="6" cy="6" r="3"></circle>
              <path d="M6 21V9a9 9 0 0 0 9 9"></path>
            </svg>
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
                <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path>
                </svg>
              </span>
              <span className="flex flex-col gap-[5px] max-w-[360px]">
                <span className="text-[15.5px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
                  {gh ? `Conectado como @${gh.user}` : 'Conecta tu cuenta de GitHub'}
                </span>
                <span className="text-[13px] leading-[1.5] text-[#8c98ac] dark:text-[#7a8699]">
                  {gh
                    ? `Encontramos ${gh.repos} repositorios. Elegirás cuáles sincronizar en el siguiente paso.`
                    : 'Te llevaremos a GitHub para autorizar el acceso y vincular tus repositorios.'}
                </span>
              </span>
              <button
                type="button"
                onClick={handleGithub}
                className="inline-flex items-center justify-center gap-[10px] h-11 px-[22px] rounded-lg text-[13.5px] font-semibold cursor-pointer transition-opacity bg-[#16202e] dark:bg-[#e8edf6] text-white dark:text-[#111826] border border-[#16202e] dark:border-[#e8edf6] hover:opacity-[0.88]"
              >
                {gh ? 'Usar otra cuenta' : 'Continuar con GitHub'}
              </button>
            </div>

            <div className="flex items-start gap-[11px] px-[15px] py-[13px] rounded-lg text-[13px] leading-[1.45] bg-[#f8fafc] dark:bg-[#0c121d] border border-[#e6eaf0] dark:border-[#253044] text-[#51607a] dark:text-[#a7b4c8]">
              <span className="flex shrink-0 mt-[1px] text-[#8c98ac] dark:text-[#7a8699]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9"></circle>
                  <path d="M12 16v-4M12 8h.01" strokeLinecap="round"></path>
                </svg>
              </span>
              <span>Pedimos permiso de lectura sobre repositorios y webhooks para detectar nuevos commits. Puedes revocarlo cuando quieras desde GitHub.</span>
            </div>

            {status && (
              <div className="flex items-center gap-[11px] px-[15px] py-[13px] rounded-lg text-[13px] leading-[1.45] bg-[#f8fafc] dark:bg-[#0c121d] border border-[#e6eaf0] dark:border-[#253044] text-[#51607a] dark:text-[#a7b4c8]">
                <span className={`flex shrink-0 ${STATUS_TONE[status.kind] || 'text-[#8c98ac] dark:text-[#7a8699]'}`}>
                  {STATUS_ICON[status.kind]}
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="11" width="18" height="10" rx="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Tus credenciales se cifran en reposo.</span>
          </div>
          <div className="flex gap-[10px] ml-0 sm:ml-auto">
            <button type="button" onClick={handleCancel} className={`${btnBase} ${btnGhost}`}>
              Cancelar
            </button>
            <button type="button" onClick={handlePrimary} className={`${btnBase} ${btnPrimary}`}>
              Finalizar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegistrarProyectoGit
