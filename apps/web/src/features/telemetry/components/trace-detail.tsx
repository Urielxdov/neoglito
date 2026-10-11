import { useTelemetryDispatch } from '@neoglito/web/features/telemetry/telemetry.context';
import { ERROR_TONE, toneOf } from '@neoglito/web/features/telemetry/service-tones';
import {
  formatAttributeValue,
  formatClock,
  formatDuration,
  formatSpanKind,
} from '@neoglito/web/features/telemetry/telemetry-format';
import {
  severityClassName,
  telemetryCardClassName,
  telemetrySectionLabelClassName,
} from '@neoglito/web/features/telemetry/components/telemetry-styles';
import type {
  TelemetryAttributes,
  TelemetryLogResponse,
} from '@neoglito/web/shared/api/contracts';
import type { ServiceTones } from '@neoglito/web/features/telemetry/service-tones';
import type {
  Trace,
  TraceSpan,
} from '@neoglito/web/features/telemetry/trace-assembly';

const TICKS = [0, 0.25, 0.5, 0.75, 1];

function KeyValueList({
  title,
  entries,
}: {
  title: string;
  entries: Array<[string, string]>;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className={telemetrySectionLabelClassName}>{title}</span>
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="grid grid-cols-[minmax(0,170px)_minmax(0,1fr)] gap-2.5 font-mono text-[11.5px] leading-normal"
        >
          <span className="truncate text-[#8c98ac] dark:text-[#7a8699]">
            {key}
          </span>
          <span className="break-words text-[#16202e] dark:text-[#e8edf6]">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

const attributeEntries = (attributes: TelemetryAttributes) =>
  Object.entries(attributes).map(
    ([key, value]): [string, string] => [key, formatAttributeValue(value)],
  );

function SpanDetail({
  entry,
  logs,
  tones,
}: {
  entry: TraceSpan;
  logs: TelemetryLogResponse[];
  tones: ServiceTones;
}) {
  const { span } = entry;

  return (
    <div className="flex flex-col gap-3.5 rounded-b-[10px] border-t border-[#e6eaf0] bg-[#fbfcfe] px-5 pt-4 pb-[18px] dark:border-[#253044] dark:bg-[#151d2c]">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={`size-2 rounded-full ${toneOf(tones, span.serviceName).dotClassName}`}
        />
        <span className="font-mono text-[13px] font-medium text-[#16202e] dark:text-[#e8edf6]">
          {span.name}
        </span>
        <span className="text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
          {span.serviceName} · {formatSpanKind(span.kind)} ·{' '}
          {formatDuration(span.durationMs)} · inicio +
          {formatDuration(entry.offsetMs)}
          {entry.isError ? ' · STATUS_CODE_ERROR' : ''}
          {span.statusMessage ? ` · ${span.statusMessage}` : ''}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[18px]">
        <KeyValueList
          title="Atributos"
          entries={[
            ['span_id', span.spanId],
            ['parent_span_id', span.parentSpanId ?? '—'],
            ...attributeEntries(span.attributes),
          ]}
        />
        <KeyValueList
          title="Recurso"
          entries={attributeEntries(span.resource)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={telemetrySectionLabelClassName}>
          Logs del span · {logs.length}
        </span>
        {logs.map((log, index) => (
          <div
            key={`${log.time}:${index}`}
            className="grid grid-cols-[96px_52px_minmax(0,1fr)] gap-2.5 font-mono text-[11.5px] leading-normal"
          >
            <span className="text-[#aab3c2] dark:text-[#5f6b7e]">
              {formatClock(Date.parse(log.time), true)}
            </span>
            <span className={`font-semibold ${severityClassName(log.severity)}`}>
              {log.severity}
            </span>
            <span className="break-words text-[#16202e] dark:text-[#e8edf6]">
              {log.body}
            </span>
          </div>
        ))}
        {logs.length === 0 && (
          <span className="text-[12px] text-[#aab3c2] dark:text-[#5f6b7e]">
            Este span no emitió logs.
          </span>
        )}
      </div>
    </div>
  );
}

export function TraceDetail({
  trace,
  tones,
  logs,
  selectedSpanId,
}: {
  trace: Trace;
  tones: ServiceTones;
  logs: TelemetryLogResponse[];
  selectedSpanId: string | null;
}) {
  const dispatch = useTelemetryDispatch();
  const total = Math.max(trace.durationMs, 1);
  const selected = trace.spans.find(
    (entry) => entry.span.spanId === selectedSpanId,
  );
  const status = trace.hasError
    ? {
        label: 'Error',
        className: `${ERROR_TONE.textClassName} ${ERROR_TONE.bgClassName}`,
      }
    : {
        label: 'OK',
        className:
          'text-[#1d7a45] bg-[#e6f4ec] dark:text-[#5fcf8f] dark:bg-[#12291d]',
      };

  return (
    <section
      className={`${telemetryCardClassName} flex min-w-0 flex-[2_1_560px] flex-col`}
    >
      <div className="flex flex-col gap-1.5 border-b border-[#e6eaf0] px-5 py-4 dark:border-[#253044]">
        <span className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-[14px] font-medium text-[#16202e] dark:text-[#e8edf6]">
            {trace.name}
          </span>
          <span
            className={`inline-flex h-[22px] items-center rounded-full px-[9px] text-[11.5px] font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        </span>
        <span className="flex flex-wrap gap-3.5 text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
          <span>
            trace_id{' '}
            <span className="font-mono text-[#51607a] dark:text-[#a7b4c8]">
              {trace.id}
            </span>
          </span>
          <span>
            {formatDuration(trace.durationMs)} · {trace.spans.length} spans ·{' '}
            {trace.services.length}{' '}
            {trace.services.length === 1 ? 'servicio' : 'servicios'} ·{' '}
            {formatClock(trace.startMs, true)}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,250px)_minmax(0,1fr)] border-b border-[#e6eaf0] px-5 pt-2 pb-1.5 font-mono text-[10.5px] text-[#aab3c2] dark:border-[#253044] dark:text-[#5f6b7e]">
        <span>Span</span>
        <span className="flex justify-between">
          {TICKS.map((fraction) => (
            <span key={fraction}>{formatDuration(total * fraction)}</span>
          ))}
        </span>
      </div>
      <div className="flex flex-col py-1">
        {trace.spans.map((entry) => {
          const { span } = entry;
          const left = (entry.offsetMs / total) * 100;
          const width = Math.max(0.5, (span.durationMs / total) * 100);
          const labelOnRight = left + width > 70;
          const labelInside = labelOnRight && left <= 12;
          const tone = toneOf(tones, span.serviceName);
          const active = selected?.span.spanId === span.spanId;

          return (
            <button
              key={span.spanId}
              type="button"
              onClick={() =>
                dispatch({
                  type: 'telemetry-span-toggled',
                  traceId: trace.id,
                  spanId: span.spanId,
                })
              }
              className={`grid min-h-[30px] grid-cols-[minmax(0,250px)_minmax(0,1fr)] items-center px-5 text-left transition-colors ${
                active
                  ? 'bg-[#eef3fc] dark:bg-[#18243a]'
                  : 'hover:bg-[#f8fafc] dark:hover:bg-[#0c121d]'
              }`}
            >
              <span
                className="flex min-w-0 items-center gap-[7px]"
                style={{ paddingLeft: entry.depth * 14 }}
              >
                <span
                  className={`size-[7px] shrink-0 rounded-full ${tone.dotClassName}`}
                />
                <span
                  className={`truncate font-mono text-[12px] ${
                    entry.isError
                      ? ERROR_TONE.textClassName
                      : 'text-[#16202e] dark:text-[#e8edf6]'
                  }`}
                >
                  {span.name}
                </span>
              </span>
              <span className="relative h-[18px]">
                <span
                  className={`absolute top-1 h-2.5 rounded-[3px] ${
                    entry.isError ? ERROR_TONE.dotClassName : tone.dotClassName
                  }`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
                <span
                  className={`absolute top-px whitespace-nowrap font-mono text-[11px] ${
                    labelInside
                      ? 'font-semibold text-white dark:text-[#111826]'
                      : 'text-[#8c98ac] dark:text-[#7a8699]'
                  }`}
                  style={
                    labelOnRight
                      ? {
                          right: labelInside
                            ? `calc(${100 - left - width}% + 6px)`
                            : `${100 - left + 1}%`,
                          textAlign: 'right',
                        }
                      : { left: `${left + width + 1}%` }
                  }
                >
                  {formatDuration(span.durationMs)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {selected && (
        <SpanDetail
          entry={selected}
          tones={tones}
          logs={logs.filter(
            (log) =>
              log.traceId === trace.id && log.spanId === selected.span.spanId,
          )}
        />
      )}
    </section>
  );
}
