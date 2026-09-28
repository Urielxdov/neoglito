export type AnalyzeServiceTone = 'ok' | 'warn' | 'neutral'

export interface AnalyzeServiceToneInfo {
  tone: AnalyzeServiceTone
  label: string
  dotClassName: string
  textClassName: string
  bgClassName: string
}

export function serviceTone(
  status: string,
  health: string,
): AnalyzeServiceToneInfo {
  if (status === 'running' && (health === 'healthy' || health === 'none')) {
    return {
      tone: 'ok',
      label: health === 'healthy' ? 'Saludable' : 'En ejecución',
      dotClassName: 'bg-[#1d7a45] dark:bg-[#5fcf8f]',
      textClassName: 'text-[#1d7a45] dark:text-[#5fcf8f]',
      bgClassName: 'bg-[#e6f4ec] dark:bg-[#12291d]',
    }
  }

  if (
    status === 'created' ||
    status === 'restarting' ||
    health === 'starting' ||
    health === 'unhealthy'
  ) {
    return {
      tone: 'warn',
      label: health === 'unhealthy' ? 'No saludable' : 'Iniciando',
      dotClassName: 'bg-[#a4550a] dark:bg-[#f0a458]',
      textClassName: 'text-[#a4550a] dark:text-[#f0a458]',
      bgClassName: 'bg-[#fbefe0] dark:bg-[#2d1f10]',
    }
  }

  return {
    tone: 'neutral',
    label: status === 'exited' ? 'Detenido' : status === 'dead' ? 'Caído' : status,
    dotClassName: 'bg-[#8c98ac] dark:bg-[#5f6b7e]',
    textClassName: 'text-[#51607a] dark:text-[#a7b4c8]',
    bgClassName: 'bg-[#f1f5f9] dark:bg-[#1a2334]',
  }
}
