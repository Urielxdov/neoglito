const SERVICE_TYPE_LABELS: Record<string, string> = {
  BACKEND: 'Backend',
  FRONTEND: 'Frontend',
  DATABASE: 'Base de datos',
  CACHE: 'Caché',
  MESSAGE_BROKER: 'Broker de mensajes',
  WORKER: 'Worker',
  SCHEDULER: 'Scheduler',
  REVERSE_PROXY: 'Proxy inverso',
  UNKNOWN: 'Sin identificar',
};

export function AnalyzeServiceTypeBadge({ type }: { type: string }) {
  const identified =
    type !== 'UNKNOWN' && Object.hasOwn(SERVICE_TYPE_LABELS, type);
  const label = identified
    ? SERVICE_TYPE_LABELS[type]
    : SERVICE_TYPE_LABELS.UNKNOWN;

  return (
    <span
      aria-label={`Tipo de servicio: ${label}`}
      title={`Tipo de servicio: ${label}`}
      className={`inline-flex w-fit shrink-0 items-center rounded-md border px-2 py-0.5 font-sans text-[11px] font-medium leading-4 ${
        identified
          ? 'border-[#d5e1f7] bg-[#eef3fc] text-[#2257c4] dark:border-[#2c4165] dark:bg-[#18243a] dark:text-[#8eb2ff]'
          : 'border-[#e0e6ef] bg-[#f8fafc] text-[#66748b] dark:border-[#2e3a51] dark:bg-[#1a2334] dark:text-[#a7b4c8]'
      }`}
    >
      {label}
    </span>
  );
}
