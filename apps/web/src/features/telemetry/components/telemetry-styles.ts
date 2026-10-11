export const telemetryCardClassName =
  'rounded-[10px] border border-[#e6eaf0] bg-white shadow-[0_1px_2px_rgba(20,32,46,0.05),0_1px_1px_rgba(20,32,46,0.04)] dark:border-[#253044] dark:bg-[#111826] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4)]';

export const telemetrySectionLabelClassName =
  'text-[11px] font-semibold uppercase tracking-[0.07em] text-[#8c98ac] dark:text-[#7a8699]';

export const telemetryEmptyClassName =
  'px-5 py-9 text-center text-[13px] leading-normal text-[#aab3c2] dark:text-[#5f6b7e]';

export function severityClassName(severity: string): string {
  if (severity === 'ERROR' || severity === 'FATAL')
    return 'text-[#c2453b] dark:text-[#e07a70]';
  if (severity === 'WARN') return 'text-[#a4550a] dark:text-[#f0a458]';
  if (severity === 'INFO') return 'text-[#8c98ac] dark:text-[#7a8699]';
  return 'text-[#aab3c2] dark:text-[#5f6b7e]';
}
