import { toneOf } from '@neoglito/web/features/telemetry/service-tones';
import {
  METRIC_VIEW_HEIGHT,
  METRIC_VIEW_WIDTH,
  metricPath,
} from '@neoglito/web/features/telemetry/metric-series';
import {
  formatClock,
  formatClockMinutes,
  formatMetricValue,
} from '@neoglito/web/features/telemetry/telemetry-format';
import {
  telemetryCardClassName,
} from '@neoglito/web/features/telemetry/components/telemetry-styles';
import type { MetricSeries } from '@neoglito/web/features/telemetry/metric-series';
import type { ServiceTones } from '@neoglito/web/features/telemetry/service-tones';

const TYPE_LABELS: Record<MetricSeries['type'], string> = {
  gauge: 'gauge',
  sum: 'suma',
  histogram: 'histograma',
  exponential_histogram: 'histograma exp.',
  summary: 'resumen',
};

export function TelemetryMetricsPanel({
  series,
  tones,
  windowEndMs,
  rangeMs,
  emptyMessage,
}: {
  series: MetricSeries[];
  tones: ServiceTones;
  windowEndMs: number;
  rangeMs: number;
  emptyMessage: string;
}) {
  const windowStartMs = windowEndMs - rangeMs;
  const axisFrom =
    rangeMs >= 6 * 60 * 60_000
      ? formatClockMinutes(windowStartMs)
      : formatClock(windowStartMs);

  if (series.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-[#d6dce5] px-5 py-12 text-center text-[13px] leading-normal text-[#aab3c2] dark:border-[#2e3a51] dark:text-[#5f6b7e]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-[18px]">
      {series.map((metric) => {
        const tone = toneOf(tones, metric.service);
        const { line, area } = metricPath(metric, windowStartMs, windowEndMs);

        return (
          <section
            key={metric.key}
            className={`${telemetryCardClassName} flex min-w-0 flex-col gap-2.5 px-[18px] pt-4 pb-3.5`}
          >
            <div className="flex items-start gap-2.5">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-mono text-[12.5px] font-medium text-[#16202e] dark:text-[#e8edf6]">
                  {metric.name}
                </span>
                <span className="flex items-center gap-1.5 text-[11.5px] text-[#8c98ac] dark:text-[#7a8699]">
                  <span className={`size-[7px] rounded-full ${tone.dotClassName}`} />
                  {metric.service} · {TYPE_LABELS[metric.type]}
                </span>
              </span>
              <span className="flex flex-col items-end gap-0.5">
                <span className="whitespace-nowrap text-[20px] font-semibold tracking-[-0.01em] text-[#16202e] dark:text-[#e8edf6]">
                  {formatMetricValue(metric.last, metric.unit)}
                </span>
                <span className="whitespace-nowrap text-[11px] text-[#aab3c2] dark:text-[#5f6b7e]">
                  máx {formatMetricValue(metric.max, metric.unit)}
                </span>
              </span>
            </div>
            <svg
              viewBox={`0 0 ${METRIC_VIEW_WIDTH} ${METRIC_VIEW_HEIGHT}`}
              preserveAspectRatio="none"
              className="block h-24 w-full overflow-visible"
              aria-hidden="true"
            >
              <line
                x1="0"
                y1="4"
                x2={METRIC_VIEW_WIDTH}
                y2="4"
                strokeDasharray="3 4"
                vectorEffect="non-scaling-stroke"
                className="stroke-[#e6eaf0] dark:stroke-[#253044]"
              />
              <line
                x1="0"
                y1="40"
                x2={METRIC_VIEW_WIDTH}
                y2="40"
                strokeDasharray="3 4"
                vectorEffect="non-scaling-stroke"
                className="stroke-[#e6eaf0] dark:stroke-[#253044]"
              />
              <line
                x1="0"
                y1="76"
                x2={METRIC_VIEW_WIDTH}
                y2="76"
                vectorEffect="non-scaling-stroke"
                className="stroke-[#d6dce5] dark:stroke-[#2e3a51]"
              />
              <path d={area} opacity="0.12" className={tone.fillClassName} />
              <path
                d={line}
                fill="none"
                strokeWidth="1.8"
                vectorEffect="non-scaling-stroke"
                className={tone.strokeClassName}
              />
            </svg>
            <div className="flex items-center justify-between font-mono text-[11px] text-[#aab3c2] dark:text-[#5f6b7e]">
              <span>{axisFrom}</span>
              <span>ahora</span>
            </div>
          </section>
        );
      })}
    </div>
  );
}
