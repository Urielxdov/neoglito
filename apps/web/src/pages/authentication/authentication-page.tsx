import { useState } from 'react'
import GitHubConnectionPanel from '../../components/RegistrarProyectoGit'
import type { Status, ThemeMode } from '../../components/RegistrarProyectoGit'
import { authService } from '../../services/auth.service'
import { useAuth } from '../../state/auth/auth-context'

export default function AuthenticationPage() {
  const { user } = useAuth()
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [status, setStatus] = useState<Status | null>(null)

  const handleGitHubConnection = () => {
    setStatus({
      kind: 'wait',
      title: 'Redirigiendo a GitHub…',
      text: 'Autoriza la aplicación para continuar.',
    })
    authService.connectWithGitHub()
  }

  const handlePrimaryAction = () => {
    setStatus({
      kind: 'ok',
      title: 'Sincronización activa.',
      text: 'Tu cuenta está lista para sincronizar repositorios.',
    })
  }

  return (
    <GitHubConnectionPanel
      theme={theme}
      account={user ? { user: user.username } : null}
      status={status}
      onThemeChange={setTheme}
      onGithub={handleGitHubConnection}
      onCancel={() => setStatus(null)}
      onPrimary={handlePrimaryAction}
    />
  )
}
