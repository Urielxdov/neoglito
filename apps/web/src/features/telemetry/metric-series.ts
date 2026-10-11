import type { TelemetryMetricPointResponse } from '@neoglito/web/shared/api/contracts';

export interface MetricSeries {
  key: string;
  service: string;
  name: string;
  unit: string | null;
  type: TelemetryMetricPointResponse['type'];
  /** Puntos con valor, de más antiguo a más reciente. */
  points: Array<{ timeMs: number; value: number }>;
  last: number;
  max: number;
}

/** Agrupa los puntos recibidos por servicio y nombre de métrica. */
export function buildMetricSeries(
  points: TelemetryMetricPointResponse[],
): MetricSeries[] {
  const groups = new Map<string, MetricSeries>();

  for (const point of points) {
    if (point.value === null) continue;
    const key = `${point.serviceName}:${point.name}`;
    const series = groups.get(key) ?? {
      key,
      service: point.serviceName,
      name: point.name,
      unit: point.unit,
      type: point.type,
      points: [],
      last: 0,
      max: 0,
    };
    series.points.push({ timeMs: Date.parse(point.time), value: point.value });
    groups.set(key, series);
  }

  return [...groups.values()]
    .map((series) => {
      const ordered = series.points.sort((a, b) => a.timeMs - b.timeMs);
      return {
        ...series,
        points: ordered,
        last: ordered[ordered.length - 1].value,
        max: Math.max(...ordered.map((point) => point.value)),
      };
    })
    .sort(
      (a, b) =>
        a.service.localeCompare(b.service) || a.name.localeCompare(b.name),
    );
}

export const METRIC_VIEW_WIDTH = 300;
export const METRIC_VIEW_HEIGHT = 80;

/** Trazo SVG de la serie dentro de la ventana [windowStartMs, windowEndMs]. */
export function metricPath(
  series: MetricSeries,
  windowStartMs: number,
  windowEndMs: number,
): { line: string; area: string } {
  const span = Math.max(windowEndMs - windowStartMs, 1);
  const ceiling = series.max * 1.12 || 1;
  const coordinates = series.points.map((point) => {
    const x = Math.min(
      Math.max((point.timeMs - windowStartMs) / span, 0),
      1,
    );
    const y = 76 - (point.value / ceiling) * 72;
    return `${(x * METRIC_VIEW_WIDTH).toFixed(1)} ${y.toFixed(1)}`;
  });
  const line = coordinates
    .map((coordinate, index) => `${index ? 'L' : 'M'}${coordinate}`)
    .join(' ');
  const [firstX] = coordinates[0].split(' ');
  const [lastX] = coordinates[coordinates.length - 1].split(' ');

  return { line, area: `${line} L${lastX} 76 L${firstX} 76 Z` };
}
