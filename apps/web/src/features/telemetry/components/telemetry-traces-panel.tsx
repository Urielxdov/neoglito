import { useTelemetryState } from '@neoglito/web/features/telemetry/telemetry.context';
import { selectActiveTrace } from '@neoglito/web/features/telemetry/telemetry.selectors';
import { TraceScatter } from '@neoglito/web/features/telemetry/components/trace-scatter';
import { TraceList } from '@neoglito/web/features/telemetry/components/trace-list';
import { TraceDetail } from '@neoglito/web/features/telemetry/components/trace-detail';
import type { TelemetryLogResponse } from '@neoglito/web/shared/api/contracts';
import type { ServiceTones } from '@neoglito/web/features/telemetry/service-tones';
import type { Trace } from '@neoglito/web/features/telemetry/trace-assembly';

export function TelemetryTracesPanel({
  traces,
  logs,
  tones,
  windowEndMs,
  rangeMs,
  emptyMessage,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  traces: Trace[];
  logs: TelemetryLogResponse[];
  tones: ServiceTones;
  windowEndMs: number;
  rangeMs: number;
  emptyMessage: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore(): void;
}) {
  const { selectedTraceId, selectedSpanId } = useTelemetryState();
  const active = selectActiveTrace(traces, selectedTraceId);

  return (
    <div className="flex flex-col gap-[18px]">
      <TraceScatter
        traces={traces}
        tones={tones}
        windowEndMs={windowEndMs}
        rangeMs={rangeMs}
        selectedTraceId={active?.id ?? null}
        errorCount={traces.filter((trace) => trace.hasError).length}
      />
      <div className="flex flex-wrap items-start gap-[18px]">
        <TraceList
          traces={traces}
          tones={tones}
          activeTraceId={active?.id ?? null}
          emptyMessage={emptyMessage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={onLoadMore}
        />
        {active && (
          <TraceDetail
            key={active.id}
            trace={active}
            tones={tones}
            logs={logs}
            selectedSpanId={selectedSpanId}
          />
        )}
      </div>
    </div>
  );
}
