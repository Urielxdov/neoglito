import { useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { NeoglitoLogo } from '@neoglito/web/components/ui/neoglito-logo'
import {
  SPLASH_COLORS,
  SPLASH_TIMELINE,
  computeLogoFrame,
  easeInOut,
  easeOut,
  lerp,
  segment,
  splashDockStart,
} from '@neoglito/web/utils/splash/neoglito-splash.helpers'

interface NeoglitoSplashProps {
  /** Logotipo ya renderizado (invisible) donde el splash debe acomodarse. */
  target: RefObject<HTMLElement | null>
  isDark: boolean
  bounces?: number
  onDocked: () => void
}

interface DockOrigin {
  rect: DOMRect
  fontSize: number
}

export function NeoglitoSplash({ target, isDark, bounces = 3, onDocked }: NeoglitoSplashProps) {
  // El tema se fija al empezar: cambiarlo a mitad no debe reiniciar la animación.
  const [colors] = useState(() => SPLASH_COLORS[isDark ? 'dark' : 'light'])
  const overlayRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<SVGPathElement>(null)
  const headRef = useRef<SVGRectElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const handleDocked = useEffectEvent(onDocked)

  useLayoutEffect(() => {
    const overlay = overlayRef.current
    const wrap = wrapRef.current
    const body = bodyRef.current
    const head = headRef.current
    const strip = stripRef.current
    if (!overlay || !wrap || !body || !head || !strip) return

    const bodyLength = body.getTotalLength()
    const dockStart = splashDockStart(bounces)
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    let dockOrigin: DockOrigin | null = null
    let startedAt: number | null = null
    let frameId = 0
    let cancelled = false

    body.style.strokeDasharray = `${bodyLength + 0.01}`

    const paintLogo = (t: number) => {
      const frame = computeLogoFrame(t, { bodyLength, dockStart, colors })
      body.style.strokeDashoffset = `${frame.dashOffset}`
      strip.style.transform = frame.stripOffset
      head.setAttribute('x', `${frame.head.x}`)
      head.setAttribute('y', `${frame.head.y}`)
      head.setAttribute('width', `${frame.head.width}`)
      head.setAttribute('height', `${frame.head.height}`)
      head.setAttribute('rx', `${frame.head.rx}`)
      head.setAttribute('transform', frame.head.transform)
      head.style.fill = frame.head.fill
    }

    const paintDock = (p: number) => {
      if (!dockOrigin) {
        const rect = wrap.getBoundingClientRect()
        dockOrigin = { rect, fontSize: parseFloat(getComputedStyle(wrap).fontSize) }
        wrap.style.left = `${rect.left}px`
        wrap.style.top = `${rect.top}px`
        wrap.style.transformOrigin = '0 0'
      }

      const destination = target.current?.getBoundingClientRect()
      const destinationSize = target.current ? parseFloat(getComputedStyle(target.current).fontSize) : dockOrigin.fontSize
      const scale = destinationSize / dockOrigin.fontSize
      const dx = destination ? destination.left - dockOrigin.rect.left : 0
      const dy = destination ? destination.top - dockOrigin.rect.top : 0
      const e = easeInOut(p)

      wrap.style.transform = `translate(${(dx * e).toFixed(2)}px,${(dy * e).toFixed(2)}px) scale(${lerp(1, scale, e).toFixed(4)})`
      overlay.style.opacity = `${1 - easeOut(p)}`
    }

    const tick = (now: number) => {
      if (cancelled) return
      startedAt ??= now
      const t = now - startedAt
      paintLogo(Math.min(t, dockStart))

      if (t >= dockStart) {
        const p = segment(t, dockStart, dockStart + SPLASH_TIMELINE.DOCK)
        paintDock(p)
        if (p >= 1) {
          root.style.overflow = previousOverflow
          handleDocked()
          return
        }
      }
      frameId = requestAnimationFrame(tick)
    }

    root.style.overflow = 'hidden'
    paintLogo(0)
    // Espera la fuente: el ancho de "eoglito" define dónde termina el carrusel.
    document.fonts.ready.then(() => {
      if (!cancelled) frameId = requestAnimationFrame(tick)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      root.style.overflow = previousOverflow
    }
  }, [bounces, colors, target])

  return (
    <>
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[9999]"
        style={{ backgroundColor: colors.background }}
      />
      <div
        ref={wrapRef}
        className="fixed top-1/2 left-1/2 z-[10000] text-[length:clamp(56px,11vw,144px)] will-change-transform"
        // transform inline (no utilidades translate de Tailwind): el dock lo reemplaza por completo.
        style={{ color: colors.ink, transform: 'translate(-50%, -50%)' }}
      >
        <NeoglitoLogo bodyRef={bodyRef} headRef={headRef} stripRef={stripRef} headClassName="" />
      </div>
    </>
  )
}
