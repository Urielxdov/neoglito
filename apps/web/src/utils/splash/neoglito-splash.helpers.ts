/**
 * Línea de tiempo del splash de Neoglito (ms):
 * N trazada → "eoglito" sale en carrusel → el nodo se despega y rebota → el logotipo se acomoda.
 */
export const SPLASH_TIMELINE = {
  DRAW: 1100,
  SLIDE_AT: 1200,
  SLIDE: 1100,
  CUT_AT: 2350,
  CUT: 280,
  MORPH_AT: 2500,
  MORPH: 380,
  BOUNCE_AT: 2950,
  PERIOD: 1400,
  DOCK: 900,
} as const

export interface SplashColors {
  background: string
  ink: string
  accent: string
}

export const SPLASH_COLORS: Record<'light' | 'dark', SplashColors> = {
  light: { background: '#f8fafc', ink: '#16202e', accent: '#2257c4' },
  dark: { background: '#0c121d', ink: '#e8edf6', accent: '#7aa4ff' },
}

/** Geometría del nodo en el viewBox del monograma. */
export const NODE_CENTER_X = 12.75
export const NODE_REST_Y = 5.5
const NODE_BASE_Y = 8.25
const NODE_LENGTH = 6.95

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
export const segment = (t: number, from: number, to: number) => clamp((t - from) / (to - from))
export const lerp = (from: number, to: number, p: number) => from + (to - from) * p
export const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3)
const easeOutQuint = (p: number) => 1 - Math.pow(1 - p, 5)

function hexToRgb(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
}

function mixColors(from: string, to: string, p: number): string {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  return `rgb(${a.map((value, i) => Math.round(lerp(value, b[i], p))).join(',')})`
}

interface BounceState {
  y: number
  sx: number
  sy: number
}

const RESTING: BounceState = { y: 0, sx: 1, sy: 1 }

/** Caída, aplastamiento, rebote y reposo del nodo dentro de un periodo (p ∈ [0, 1]). */
function bounce(p: number): BounceState {
  if (p < 0.38) {
    const k = p / 0.38
    return { y: k * k, sx: lerp(1, 0.92, k), sy: lerp(1, 1.08, k) }
  }
  if (p < 0.44) {
    const k = segment(p, 0.38, 0.44)
    return { y: 1, sx: lerp(0.92, 1.22, k), sy: lerp(1.08, 0.74, k) }
  }
  if (p < 0.52) {
    const k = segment(p, 0.44, 0.52)
    return { y: 1, sx: lerp(1.22, 0.94, k), sy: lerp(0.74, 1.06, k) }
  }
  if (p < 0.82) {
    const k = segment(p, 0.52, 0.82)
    return { y: (1 - k) * (1 - k), sx: lerp(0.94, 1, k), sy: lerp(1.06, 1, k) }
  }
  return RESTING
}

/** Momento en que termina el último rebote y el logotipo empieza a acomodarse. */
export function splashDockStart(bounces: number): number {
  const { BOUNCE_AT, PERIOD } = SPLASH_TIMELINE
  return BOUNCE_AT + (Math.max(1, bounces) - 1) * PERIOD + 0.82 * PERIOD
}

export interface LogoFrame {
  dashOffset: number
  stripOffset: string
  head: {
    x: number
    y: number
    width: number
    height: number
    rx: number
    fill: string
    transform: string
  }
}

interface LogoFrameOptions {
  bodyLength: number
  dockStart: number
  colors: SplashColors
}

/** Estado del monograma y la palabra en el instante t de la animación. */
export function computeLogoFrame(t: number, { bodyLength, dockStart, colors }: LogoFrameOptions): LogoFrame {
  const T = SPLASH_TIMELINE
  const drawn = easeInOut(segment(t, 0, T.DRAW)) * (bodyLength + NODE_LENGTH)
  const slide = easeOutQuint(segment(t, T.SLIDE_AT, T.SLIDE_AT + T.SLIDE))
  const top = NODE_BASE_Y - clamp(drawn - bodyLength, 0, NODE_LENGTH)
  const bottom = lerp(NODE_BASE_Y, NODE_REST_Y, easeOut(segment(t, T.CUT_AT, T.CUT_AT + T.CUT)))
  const morph = easeOut(segment(t, T.MORPH_AT, T.MORPH_AT + T.MORPH))
  const width = lerp(3.5, 4.2, morph)
  const b = t >= T.BOUNCE_AT && t < dockStart ? bounce(((t - T.BOUNCE_AT) % T.PERIOD) / T.PERIOD) : RESTING

  return {
    dashOffset: bodyLength - Math.min(drawn, bodyLength),
    stripOffset: `translateX(${((1 - slide) * -100).toFixed(3)}%)`,
    head: {
      x: NODE_CENTER_X - width / 2,
      y: top,
      width,
      height: Math.max(0, bottom - top),
      rx: lerp(0, 2.1, morph),
      fill: mixColors(colors.ink, colors.accent, morph),
      transform: `translate(${NODE_CENTER_X} ${NODE_REST_Y + b.y * 2.75}) scale(${b.sx} ${b.sy}) translate(${-NODE_CENTER_X} ${-NODE_REST_Y})`,
    },
  }
}
