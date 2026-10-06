import type { Ref } from 'react'

interface NeoglitoLogoProps {
  ref?: Ref<HTMLDivElement>
  bodyRef?: Ref<SVGPathElement>
  headRef?: Ref<SVGRectElement>
  stripRef?: Ref<HTMLDivElement>
  className?: string
  /** Clases del nodo en reposo; el splash lo colorea por su cuenta. */
  headClassName?: string
}

/**
 * Logotipo de Neoglito ya acomodado. Todo se mide en em: el tamaño lo define el font-size
 * del contenedor, de modo que el splash puede escalar uno idéntico hasta encajar con este.
 */
export function NeoglitoLogo({
  ref,
  bodyRef,
  headRef,
  stripRef,
  className = '',
  headClassName = 'fill-[#2257c4] dark:fill-[#7aa4ff]',
}: NeoglitoLogoProps) {
  return (
    <div
      ref={ref}
      role="img"
      aria-label="Neoglito"
      className={`flex items-baseline font-['IBM_Plex_Sans',system-ui,sans-serif] font-semibold leading-none tracking-[-0.025em] ${className}`}
    >
      <svg viewBox="0 1.3 16 12.7" aria-hidden="true" className="h-[0.698em] w-[0.88em] flex-none overflow-visible">
        <path
          ref={bodyRef}
          d="M3.25 14V3.25L12.75 12.25V8.25"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
        <rect ref={headRef} x={10.65} y={1.3} width={4.2} height={4.2} rx={2.1} className={headClassName} />
      </svg>
      <div aria-hidden="true" className="ml-[0.08em] flex text-[0.6em] tracking-[-0.015em] [clip-path:inset(-1em_-1em_-1em_0)]">
        <div ref={stripRef} className="flex">eoglito</div>
      </div>
    </div>
  )
}
