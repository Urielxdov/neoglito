export interface ServiceTone {
  /** Fondo sólido para puntos, barras y marcadores del servicio. */
  dotClassName: string;
  /** Trazo para las líneas de las gráficas. */
  strokeClassName: string;
  /** Relleno suave para el área bajo la línea. */
  fillClassName: string;
}

const PALETTE: ServiceTone[] = [
  {
    dotClassName: 'bg-[#2257c4] dark:bg-[#5b8df5]',
    strokeClassName: 'stroke-[#2257c4] dark:stroke-[#5b8df5]',
    fillClassName: 'fill-[#2257c4] dark:fill-[#5b8df5]',
  },
  {
    dotClassName: 'bg-[#1d7a45] dark:bg-[#5fcf8f]',
    strokeClassName: 'stroke-[#1d7a45] dark:stroke-[#5fcf8f]',
    fillClassName: 'fill-[#1d7a45] dark:fill-[#5fcf8f]',
  },
  {
    dotClassName: 'bg-[#7a4fb5] dark:bg-[#b18fe0]',
    strokeClassName: 'stroke-[#7a4fb5] dark:stroke-[#b18fe0]',
    fillClassName: 'fill-[#7a4fb5] dark:fill-[#b18fe0]',
  },
  {
    dotClassName: 'bg-[#a4550a] dark:bg-[#f0a458]',
    strokeClassName: 'stroke-[#a4550a] dark:stroke-[#f0a458]',
    fillClassName: 'fill-[#a4550a] dark:fill-[#f0a458]',
  },
  {
    dotClassName: 'bg-[#0f7f86] dark:bg-[#4fc3c9]',
    strokeClassName: 'stroke-[#0f7f86] dark:stroke-[#4fc3c9]',
    fillClassName: 'fill-[#0f7f86] dark:fill-[#4fc3c9]',
  },
  {
    dotClassName: 'bg-[#b03a74] dark:bg-[#e58ab4]',
    strokeClassName: 'stroke-[#b03a74] dark:stroke-[#e58ab4]',
    fillClassName: 'fill-[#b03a74] dark:fill-[#e58ab4]',
  },
];

export const ERROR_TONE = {
  dotClassName: 'bg-[#c2453b] dark:bg-[#e07a70]',
  textClassName: 'text-[#c2453b] dark:text-[#e07a70]',
  bgClassName: 'bg-[#fbf1f0] dark:bg-[#2a1a19]',
};

export type ServiceTones = Record<string, ServiceTone>;

/** Asigna un color estable (orden alfabético) a cada servicio detectado. */
export function assignServiceTones(serviceNames: Iterable<string>): ServiceTones {
  const sorted = [...new Set(serviceNames)].sort((a, b) => a.localeCompare(b));
  return Object.fromEntries(
    sorted.map((name, index) => [name, PALETTE[index % PALETTE.length]]),
  );
}

export function toneOf(tones: ServiceTones, service: string): ServiceTone {
  return tones[service] ?? PALETTE[0];
}
