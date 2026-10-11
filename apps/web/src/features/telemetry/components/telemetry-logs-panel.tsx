import {
  useTelemetryDispatch,
  useTelemetryState,
} from '@neoglito/web/features/telemetry/telemetry.context';
import {
  LOG_LEVELS,
  matchesLogLevel,
} from '@neoglito/web/features/telemetry/telemetry.selectors';
import { toneOf } from '@neoglito/web/features/telemetry/service-tones';
import { formatClock } from '@neoglito/web/features/telemetry/telemetry-format';
import {
  severityClassName,
  telemetryCardClassName,
  telemetryEmptyClassName,
} from '@neoglito/web/features/telemetry/components/telemetry-styles';
import type { TelemetryLogResponse } from '@neoglito/web/shared/api/contracts';
import type { ServiceTones } from '@neoglito/web/features/telemetry/service-tones';

const MAX_ROWS = 250;
const ROW_GRID =
  'grid grid-cols-[96px_minmax(0,170px)_52px_minmax(0,1fr)_92px] gap-3';

export function TelemetryLogsPanel({
  logs,
  tones,
  emptyMessage,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  logs: TelemetryLogResponse[];
  tones: ServiceTones;
  emptyMessage: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore(): void;
}) {
  const { logSeverity, logQuery } = useTelemetryState();
  const dispatch = useTelemetryDispatch();
  const query = logQuery.trim().toLowerCase();
  const matching = query
    ? logs.filter(
        (log) =>
          log.body.toLowerCase().includes(query) ||
          (log.traceId ?? '').startsWith(query),
      )
    : logs;
  const shown = matching.filter((log) =>
    matchesLogLevel(log.severity, logSeverity),
  );

  return (
    <section className={`${telemetryCardClassName} flex min-w-0 flex-col`}>
      <div className="flex flex-wrap items-center gap-2.5 border-b border-[#e6eaf0] px-5 py-3.5 dark:border-[#253044]">
        <div className="flex gap-1 rounded-[9px] border border-[#e6eaf0] bg-[#f8fafc] p-[3px] dark:border-[#253044] dark:bg-[#0c121d]">
          {LOG_LEVELS.map((level) => {
            const on = logSeverity === level.key;
            const count = matching.filter((log) =>
              matchesLogLevel(log.severity, level.key),
            ).length;

            return (
              <button
                key={level.label}
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'telemetry-log-severity-changed',
                    severity: level.key,
                  })
                }
                className={`flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-[11px] text-[12px] font-semibold transition-colors ${
                  on
                    ? `bg-white shadow-[0_1px_2px_rgba(20,32,46,0.05)] dark:bg-[#111826] ${
                        level.key === 'WARN' || level.key === 'ERROR'
                          ? severityClassName(level.key)
                          : 'text-[#16202e] dark:text-[#e8edf6]'
                      }`
                    : 'text-[#8c98ac] hover:text-[#51607a] dark:text-[#7a8699] dark:hover:text-[#a7b4c8]'
                }`}
              >
                <span>{level.label}</span>
                <span className="text-[11px] text-[#aab3c2] dark:text-[#5f6b7e]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <input
          type="search"
          value={logQuery}
          onChange={(event) =>
            dispatch({
              type: 'telemetry-log-query-changed',
              query: event.target.value,
            })
          }
          placeholder="Buscar en body o trace_id…"
          aria-label="Buscar en los logs"
          className="h-9 min-w-0 flex-[1_1_220px] rounded-lg border border-[#e6eaf0] bg-white px-3 font-mono text-[12.5px] text-[#16202e] outline-none placeholder:text-[#aab3c2] focus:border-[#2257c4] dark:border-[#253044] dark:bg-[#111826] dark:text-[#e8edf6] dark:placeholder:text-[#5f6b7e] dark:focus:border-[#5b8df5]"
        />
      </div>
      <div
        className={`${ROW_GRID} border-b border-[#e6eaf0] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8c98ac] dark:border-[#253044] dark:text-[#7a8699]`}
      >
        <span>Hora</span>
        <span>Servicio</span>
        <span>Nivel</span>
        <span>Body</span>
        <span>Traza</span>
      </div>
      <div className="max-h-[560px] overflow-auto bg-[#fbfcfe] py-1.5 font-mono text-[12.5px] leading-[1.6] dark:bg-[#151d2c]">
        {shown.slice(0, MAX_ROWS).map((log, index) => (
          <div
            key={`${log.time}:${index}`}
            className={`${ROW_GRID} items-baseline px-5 py-[3px] ${
              log.severity === 'ERROR' || log.severity === 'FATAL'
                ? 'bg-[#fbf1f0] dark:bg-[#2a1a19]'
                : ''
            }`}
          >
            <span className="whitespace-nowrap text-[#aab3c2] dark:text-[#5f6b7e]">
              {formatClock(Date.parse(log.time), true)}
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-[#51607a] dark:text-[#a7b4c8]">
              <span
                className={`size-[7px] shrink-0 rounded-full ${toneOf(tones, log.serviceName).dotClassName}`}
              />
              <span className="truncate">{log.serviceName}</span>
            </span>
            <span
              className={`text-[11px] font-semibold ${severityClassName(log.severity)}`}
            >
              {log.severity}
            </span>
            <span className="break-words text-[#16202e] dark:text-[#e8edf6]">
              {log.body}
            </span>
            {log.traceId ? (
              <button
                type="button"
                title="Abrir traza"
                onClick={() =>
                  dispatch({
                    type: 'telemetry-trace-opened',
                    traceId: log.traceId!,
                    spanId: log.spanId,
                  })
                }
                className="text-left text-[12px] text-[#2257c4] hover:underline dark:text-[#5b8df5]"
              >
                {log.traceId.slice(0, 8)} →
              </button>
            ) : (
              <span className="text-[#aab3c2] dark:text-[#5f6b7e]">—</span>
            )}
          </div>
        ))}
        {shown.length === 0 && (
          <div className={`${telemetryEmptyClassName} font-sans`}>
            {matching.length === 0 && !query ? emptyMessage : 'Ningún log coincide con los filtros.'}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[#e6eaf0] px-5 py-[11px] text-[12.5px] text-[#8c98ac] dark:border-[#253044] dark:text-[#7a8699]">
        <span>
          Mostrando {Math.min(MAX_ROWS, shown.length)} de {shown.length}{' '}
          registros · más recientes primero
        </span>
        {hasNextPage && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="font-semibold text-[#2257c4] hover:underline disabled:opacity-60 dark:text-[#5b8df5]"
          >
            {isFetchingNextPage ? 'Cargando...' : 'Cargar logs anteriores'}
          </button>
        )}
      </div>
    </section>
  );
}
