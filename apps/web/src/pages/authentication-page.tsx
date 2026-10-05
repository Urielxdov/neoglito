import { useState } from 'react'
import { GitHubConnectionPanel } from "@neoglito/web/features/auth/github-connection-panel"
import type { Status } from "@neoglito/web/features/auth/github-connection-panel"
import { authService } from "@neoglito/web/features/auth/auth.service"
import { useAuth } from "@neoglito/web/features/auth/use-auth"

export default function AuthenticationPage() {
  const { user } = useAuth()
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
      account={user ? { user: user.username } : null}
      status={status}
      onGithub={handleGitHubConnection}
      onCancel={() => setStatus(null)}
      onPrimary={handlePrimaryAction}
    />
  )
}
