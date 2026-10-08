import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  playNeoglitoSplash,
  shouldPlayNeoglitoSplash,
} from '@neoglito/web/shared/branding/neoglito-splash'
import type { NeoglitoSplashColors } from '@neoglito/web/shared/branding/neoglito-splash'

const LIGHT_COLORS: NeoglitoSplashColors = { background: '#f8fafc', ink: '#16202e', accent: '#2257c4' }
const DARK_COLORS: NeoglitoSplashColors = { background: '#0c121d', ink: '#e8edf6', accent: '#7aa4ff' }

/**
 * Reproduce el splash al iniciar la app y lo acomoda sobre `targetRef`.
 * Devuelve `docked`: false mientras el logotipo animado aún no llega a su sitio.
 */
export function useNeoglitoSplash(targetRef: RefObject<HTMLElement | null>, isDark: boolean) {
  const [docked, setDocked] = useState(() => !shouldPlayNeoglitoSplash())
  const isDarkRef = useRef(isDark)

  useEffect(() => {
    const target = targetRef.current
    if (docked || !target) return
    const splash = playNeoglitoSplash({
      ...(isDarkRef.current ? DARK_COLORS : LIGHT_COLORS),
      target,
      onDock: () => setDocked(true),
    })
    return splash.cancel
  }, [docked, targetRef])

  return docked
}
