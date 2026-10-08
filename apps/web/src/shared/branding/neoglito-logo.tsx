import type { CSSProperties, Ref } from 'react'

interface NeoglitoLogoProps {
  ref?: Ref<HTMLSpanElement>
  className?: string
  style?: CSSProperties
}

/** Logotipo Neoglito en su estado final (el mismo que deja el splash al acomodarse). */
export function NeoglitoLogo({ ref, className = '', style }: NeoglitoLogoProps) {
  return (
    <span
      ref={ref}
      role="img"
      aria-label="Neoglito"
      className={`flex items-baseline font-['IBM_Plex_Sans',system-ui,sans-serif] leading-none font-semibold tracking-[-0.025em] ${className}`}
      style={style}
    >
      <svg viewBox="0 1.3 16 12.7" aria-hidden="true" className="h-[0.698em] w-[0.88em] flex-none overflow-visible">
        <path d="M3.25 14V3.25L12.75 12.25V8.25" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" />
        <rect x="10.65" y="1.3" width="4.2" height="4.2" rx="2.1" className="fill-[#2257c4] dark:fill-[#7aa4ff]" />
      </svg>
      <span aria-hidden="true" className="ml-[0.08em] flex text-[0.6em] tracking-[-0.015em]">eoglito</span>
    </span>
  )
}
