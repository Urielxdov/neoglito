import { useTelemetryDispatch } from '@neoglito/web/features/telemetry/telemetry.context';
import { ERROR_TONE, toneOf } from '@neoglito/web/features/telemetry/service-tones';
import {
  formatClock,
  formatDuration,
} from '@neoglito/web/features/telemetry/telemetry-format';
import {
  telemetryCardClassName,
  telemetryEmptyClassName,
} from '@neoglito/web/features/telemetry/components/telemetry-styles';
import type { ServiceTones } from '@neoglito/web/features/telemetry/service-tones';
import type { Trace } from '@neoglito/web/features/telemetry/trace-assembly';

const MAX_ROWS = 200;

export function TraceList({
  traces,
  tones,
  activeTraceId,
  emptyMessage,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  traces: Trace[];
  tones: ServiceTones;
  activeTraceId: string | null;
  emptyMessage: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore(): void;
}) {
  const dispatch = useTelemetryDispatch();
  const rows = traces.slice(0, MAX_ROWS);
  const maxDuration = Math.max(1, ...rows.map((trace) => trace.durationMs));

  return (
    <section
      className={`${telemetryCardClassName} flex min-w-0 flex-[1_1_360px] flex-col overflow-hidden`}
    >
      <div className="flex items-baseline gap-2.5 border-b border-[#e6eaf0] px-[18px] py-3.5 dark:border-[#253044]">
        <span className="text-[14px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
          Trazas
        </span>
        <span className="text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
          {traces.length > MAX_ROWS
            ? `Mostrando ${MAX_ROWS} de ${traces.length} · más recientes primero`
            : `${traces.length} en el rango`}
        </span>
      </div>
      <div className="flex max-h-[640px] flex-col overflow-auto">
        {rows.map((trace) => {
          const active = trace.id === activeTraceId;
          const root = trace.spans[0].span;
          const barTone = trace.hasError
            ? ERROR_TONE.dotClassName
            : toneOf(tones, root.serviceName).dotClassName;

          return (
            <button
              key={trace.id}
              type="button"
              onClick={() =>
                dispatch({ type: 'telemetry-trace-selected', traceId: trace.id })
              }
              className={`flex flex-col gap-[7px] border-b border-l-[3px] border-b-[#e6eaf0] py-[11px] pr-4 pl-[15px] text-left transition-colors dark:border-b-[#253044] ${
                active
                  ? 'border-l-[#2257c4] bg-[#eef3fc] dark:border-l-[#5b8df5] dark:bg-[#18243a]'
                  : 'border-l-transparent hover:bg-[#f8fafc] dark:hover:bg-[#0c121d]'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] font-medium text-[#16202e] dark:text-[#e8edf6]">
                  {trace.name}
                </span>
                <span
                  className={`whitespace-nowrap font-mono text-[12px] font-medium ${
                    trace.hasError
                      ? ERROR_TONE.textClassName
                      : 'text-[#51607a] dark:text-[#a7b4c8]'
                  }`}
                >
                  {formatDuration(trace.durationMs)}
                </span>
              </span>
              <span className="h-1 overflow-hidden rounded-full bg-[#f1f5f9] dark:bg-[#1a2334]">
                <span
                  className={`block h-full rounded-full ${barTone}`}
                  style={{
                    width: `${Math.max(2, (trace.durationMs / maxDuration) * 100)}%`,
                  }}
                />
              </span>
              <span className="flex items-center gap-2 text-[11.5px] text-[#8c98ac] dark:text-[#7a8699]">
                <span className="flex gap-[3px]">
                  {trace.services.map((service) => (
                    <span
                      key={service}
                      title={service}
                      className={`size-[7px] rounded-full ${toneOf(tones, service).dotClassName}`}
                    />
                  ))}
                </span>
                <span>
                  {trace.spans.length} spans{trace.hasError ? ' · error' : ''}
                </span>
                <span className="flex-1" />
                <span className="font-mono">{formatClock(trace.startMs)}</span>
              </span>
            </button>
          );
        })}
        {rows.length === 0 && (
          <div className={telemetryEmptyClassName}>{emptyMessage}</div>
        )}
        {hasNextPage && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="m-3 h-9 rounded-lg border border-[#d6dce5] bg-white text-[12.5px] font-semibold text-[#51607a] hover:bg-[#f1f5f9] disabled:opacity-60 dark:border-[#2e3a51] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]"
          >
            {isFetchingNextPage ? 'Cargando...' : 'Cargar trazas anteriores'}
          </button>
        )}
      </div>
    </section>
  );
}
