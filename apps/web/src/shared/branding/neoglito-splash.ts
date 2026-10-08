/*
 * Neoglito Splash
 * Secuencia: N trazada → "eoglito" sale en carrusel → el nodo se despega y rebota N veces
 * → el logotipo se reduce y se acomoda sobre el elemento `target` (el logo del header).
 */

export interface NeoglitoSplashColors {
  background: string
  ink: string
  accent: string
}

export interface NeoglitoSplashOptions extends NeoglitoSplashColors {
  target: HTMLElement
  bounces?: number
  zIndex?: number
  onDock?: () => void
}

export interface NeoglitoSplashHandle {
  cancel: () => void
}

interface Bounce {
  y: number
  sx: number
  sy: number
}

const STYLE_ID = 'ngs-style'
const SESSION_KEY = 'neoglito-splash-played'

const CSS = [
  '.ngs-overlay{position:fixed;inset:0;pointer-events:none}',
  '.ngs-wrap{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);font-size:clamp(56px,11vw,144px);pointer-events:none;will-change:transform}',
  '.ngs-logo{display:flex;align-items:baseline;font-family:"IBM Plex Sans",system-ui,sans-serif;font-weight:600;letter-spacing:-.025em;line-height:1}',
  '.ngs-mark{width:.88em;height:.698em;overflow:visible;flex:none}',
  '.ngs-word{display:flex;font-size:.6em;letter-spacing:-.015em;margin-left:.08em;clip-path:inset(-1em -1em -1em 0)}',
  '.ngs-strip{display:flex;transform:translateX(-100%);will-change:transform}',
].join('')

const T = { DRAW: 1100, SLIDE_AT: 1200, SLIDE: 1100, CUT_AT: 2350, CUT: 280, MORPH_AT: 2500, MORPH: 380, BOUNCE_AT: 2950, PERIOD: 1400, DOCK: 900 }

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const lerp = (a: number, b: number, p: number) => a + (b - a) * p
const inOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const out = (p: number) => 1 - Math.pow(1 - p, 3)
const outQuint = (p: number) => 1 - Math.pow(1 - p, 5)
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const mix = (a: string, b: string, p: number) => {
  const A = rgb(a)
  const B = rgb(b)
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], p))).join(',')})`
}

function bounce(p: number): Bounce {
  let k: number
  if (p < 0.38) { k = p / 0.38; return { y: k * k, sx: lerp(1, 0.92, k), sy: lerp(1, 1.08, k) } }
  if (p < 0.44) { k = seg(p, 0.38, 0.44); return { y: 1, sx: lerp(0.92, 1.22, k), sy: lerp(1.08, 0.74, k) } }
  if (p < 0.52) { k = seg(p, 0.44, 0.52); return { y: 1, sx: lerp(1.22, 0.94, k), sy: lerp(0.74, 1.06, k) } }
  if (p < 0.82) { k = seg(p, 0.52, 0.82); return { y: (1 - k) * (1 - k), sx: lerp(0.94, 1, k), sy: lerp(1.06, 1, k) } }
  return { y: 0, sx: 1, sy: 1 }
}

/** Indica si el splash debe reproducirse (no en movimiento reducido ni si ya se vio en esta sesión). */
export function shouldPlayNeoglitoSplash(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return sessionStorage.getItem(SESSION_KEY) !== '1'
  } catch {
    return true
  }
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}

export function playNeoglitoSplash(options: NeoglitoSplashOptions): NeoglitoSplashHandle {
  const { target, background, ink, accent, onDock } = options
  const bounces = Math.max(1, options.bounces ?? 3)
  const zIndex = options.zIndex ?? 9999
  injectStyles()

  const overlay = document.createElement('div')
  overlay.className = 'ngs-overlay'
  overlay.style.cssText = `background:${background};z-index:${zIndex}`
  const wrap = document.createElement('div')
  wrap.className = 'ngs-wrap'
  wrap.style.zIndex = String(zIndex + 1)
  wrap.style.color = ink
  wrap.innerHTML =
    '<div class="ngs-logo" role="img" aria-label="Neoglito">' +
      '<svg class="ngs-mark" viewBox="0 1.3 16 12.7" aria-hidden="true">' +
        `<path class="ngs-body" d="M3.25 14V3.25L12.75 12.25V8.25" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"></path>` +
        `<rect class="ngs-head" x="11" y="8.25" width="3.5" height="0" fill="${ink}"></rect>` +
      '</svg>' +
      '<div class="ngs-word" aria-hidden="true"><div class="ngs-strip">eoglito</div></div>' +
    '</div>'
  document.body.appendChild(overlay)
  document.body.appendChild(wrap)

  const body = wrap.querySelector<SVGPathElement>('.ngs-body')!
  const head = wrap.querySelector<SVGRectElement>('.ngs-head')!
  const strip = wrap.querySelector<HTMLElement>('.ngs-strip')!
  const L1 = body.getTotalLength()
  const L2 = 6.95
  const DOCK_AT = T.BOUNCE_AT + (bounces - 1) * T.PERIOD + 0.82 * T.PERIOD
  const prevOverflow = document.documentElement.style.overflow
  let dockFrom: { left: number; top: number; fontSize: number } | null = null
  let start: number | null = null
  let rafId = 0
  let done = false
  body.style.strokeDasharray = String(L1 + 0.01)

  function renderLogo(t: number) {
    const d = inOut(seg(t, 0, T.DRAW)) * (L1 + L2)
    body.style.strokeDashoffset = String(L1 - Math.min(d, L1))
    strip.style.transform = `translateX(${((1 - outQuint(seg(t, T.SLIDE_AT, T.SLIDE_AT + T.SLIDE))) * -100).toFixed(3)}%)`
    const top = 8.25 - clamp(d - L1, 0, L2)
    const bot = lerp(8.25, 5.5, out(seg(t, T.CUT_AT, T.CUT_AT + T.CUT)))
    const m = out(seg(t, T.MORPH_AT, T.MORPH_AT + T.MORPH))
    const w = lerp(3.5, 4.2, m)
    head.setAttribute('x', String(12.75 - w / 2))
    head.setAttribute('width', String(w))
    head.setAttribute('y', String(top))
    head.setAttribute('height', String(Math.max(0, bot - top)))
    head.setAttribute('rx', String(lerp(0, 2.1, m)))
    head.setAttribute('fill', mix(ink, accent, m))
    const b = t >= T.BOUNCE_AT && t < DOCK_AT ? bounce(((t - T.BOUNCE_AT) % T.PERIOD) / T.PERIOD) : { y: 0, sx: 1, sy: 1 }
    head.setAttribute('transform', `translate(12.75 ${5.5 + b.y * 2.75}) scale(${b.sx} ${b.sy}) translate(-12.75 -5.5)`)
  }

  function dockAt(p: number) {
    if (!dockFrom) {
      const r = wrap.getBoundingClientRect()
      dockFrom = { left: r.left, top: r.top, fontSize: parseFloat(getComputedStyle(wrap).fontSize) }
      wrap.style.left = `${r.left}px`
      wrap.style.top = `${r.top}px`
      wrap.style.transformOrigin = '0 0'
    }
    // Se mide en cada frame para seguir al header si la ventana cambia de tamaño.
    const tg = target.getBoundingClientRect()
    const s = parseFloat(getComputedStyle(target).fontSize) / dockFrom.fontSize
    const e = inOut(p)
    wrap.style.transform = `translate(${((tg.left - dockFrom.left) * e).toFixed(2)}px,${((tg.top - dockFrom.top) * e).toFixed(2)}px) scale(${lerp(1, s, e).toFixed(4)})`
    overlay.style.opacity = String(1 - out(p))
  }

  function cleanup() {
    done = true
    cancelAnimationFrame(rafId)
    overlay.remove()
    wrap.remove()
    document.documentElement.style.overflow = prevOverflow
  }

  function finish() {
    cleanup()
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* sin almacenamiento de sesión */ }
    onDock?.()
  }

  function frame(now: number) {
    if (done) return
    if (start === null) start = now
    const t = now - start
    renderLogo(Math.min(t, DOCK_AT))
    if (t >= DOCK_AT) {
      const p = seg(t, DOCK_AT, DOCK_AT + T.DOCK)
      dockAt(p)
      if (p >= 1) { finish(); return }
    }
    rafId = requestAnimationFrame(frame)
  }

  document.documentElement.style.overflow = 'hidden'
  renderLogo(0)
  document.fonts.ready.then(() => {
    if (!done) rafId = requestAnimationFrame(frame)
  })

  return { cancel: cleanup }
}
