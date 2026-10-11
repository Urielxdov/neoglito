import { useTelemetryDispatch } from '@neoglito/web/features/telemetry/telemetry.context';
import { ERROR_TONE, toneOf } from '@neoglito/web/features/telemetry/service-tones';
import {
  formatClock,
  formatClockMinutes,
  formatDuration,
} from '@neoglito/web/features/telemetry/telemetry-format';
import {
  telemetryCardClassName,
} from '@neoglito/web/features/telemetry/components/telemetry-styles';
import type { ServiceTones } from '@neoglito/web/features/telemetry/service-tones';
import type { Trace } from '@neoglito/web/features/telemetry/trace-assembly';

const MAX_POINTS = 300;
const MIN_MS = 10;
const MAX_MS = 10_000;

/** Eje logarítmico entre 10 ms y 10 s, en porcentaje de la altura. */
function heightPercent(durationMs: number) {
  const clamped = Math.min(Math.max(durationMs, MIN_MS), MAX_MS);
  return ((Math.log10(clamped) - 1) / 3) * 100;
}

const axisLabelClassName =
  'absolute right-0 font-mono text-[10.5px] text-[#aab3c2] dark:text-[#5f6b7e]';

export function TraceScatter({
  traces,
  tones,
  windowEndMs,
  rangeMs,
  selectedTraceId,
  errorCount,
}: {
  traces: Trace[];
  tones: ServiceTones;
  windowEndMs: number;
  rangeMs: number;
  selectedTraceId: string | null;
  errorCount: number;
}) {
  const dispatch = useTelemetryDispatch();
  const windowStartMs = windowEndMs - rangeMs;
  const axisFrom =
    rangeMs >= 6 * 60 * 60_000
      ? formatClockMinutes(windowStartMs)
      : formatClock(windowStartMs);

  return (
    <section
      className={`${telemetryCardClassName} flex flex-col gap-2.5 px-[22px] pt-4 pb-3.5`}
    >
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="text-[14px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
          Duración por traza
        </span>
        <span className="text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
          {traces.length} trazas · {errorCount} con error
        </span>
      </div>
      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
        <div className="relative h-[120px]">
          <span className={`${axisLabelClassName} -top-1.5`}>10 s</span>
          <span className={`${axisLabelClassName} top-[34px]`}>1 s</span>
          <span className={`${axisLabelClassName} top-[74px]`}>100 ms</span>
          <span className={`${axisLabelClassName} -bottom-1.5`}>10 ms</span>
        </div>
        <div className="relative h-[120px] border-b border-l border-[#e6eaf0] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_39px,#e6eaf0_39px,#e6eaf0_40px)] dark:border-[#253044] dark:bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_39px,#253044_39px,#253044_40px)]">
          {traces.slice(0, MAX_POINTS).map((trace) => {
            const selected = trace.id === selectedTraceId;
            const root = trace.spans[0].span;
            const left = Math.min(
              Math.max((1 - (windowEndMs - trace.startMs) / rangeMs) * 100, 0),
              100,
            );

            return (
              <button
                key={trace.id}
                type="button"
                title={`${root.name} · ${formatDuration(trace.durationMs)}`}
                onClick={() =>
                  dispatch({ type: 'telemetry-trace-selected', traceId: trace.id })
                }
                style={{
                  left: `${left}%`,
                  bottom: `${heightPercent(trace.durationMs)}%`,
                }}
                className={`absolute -translate-x-1/2 translate-y-1/2 rounded-full border-2 p-0 ${
                  selected
                    ? 'size-3 border-[#16202e] dark:border-[#e8edf6]'
                    : 'size-[9px] border-white dark:border-[#111826]'
                } ${
                  trace.hasError
                    ? ERROR_TONE.dotClassName
                    : toneOf(tones, root.serviceName).dotClassName
                }`}
              />
            );
          })}
        </div>
        <span />
        <div className="flex justify-between font-mono text-[10.5px] text-[#aab3c2] dark:text-[#5f6b7e]">
          <span>{axisFrom}</span>
          <span>ahora</span>
        </div>
      </div>
    </section>
  );
}
