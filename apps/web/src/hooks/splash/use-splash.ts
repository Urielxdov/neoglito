import { useState } from 'react'

const SPLASH_STORAGE_KEY = 'neoglito-splash-played'

function shouldPlaySplash(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return window.sessionStorage.getItem(SPLASH_STORAGE_KEY) !== '1'
  } catch {
    return true
  }
}

/** El splash se reproduce una vez por sesión; en recargas el logotipo aparece ya acomodado. */
export function useSplash() {
  const [isPlaying, setIsPlaying] = useState(shouldPlaySplash)

  const finishSplash = () => {
    try {
      window.sessionStorage.setItem(SPLASH_STORAGE_KEY, '1')
    } catch {
      // Sin sessionStorage se volverá a reproducir en la siguiente recarga.
    }
    setIsPlaying(false)
  }

  return { isPlaying, finishSplash }
}
