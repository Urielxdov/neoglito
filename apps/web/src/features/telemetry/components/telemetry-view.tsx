import { Link } from 'react-router-dom';
import {
  useTelemetryDispatch,
  useTelemetryState,
} from '@neoglito/web/features/telemetry/telemetry.context';
import { TELEMETRY_RANGES } from '@neoglito/web/features/telemetry/telemetry.reducer';
import { useTelemetryPages } from '@neoglito/web/features/telemetry/use-telemetry-pages';
import { assembleTraces } from '@neoglito/web/features/telemetry/trace-assembly';
import { buildMetricSeries } from '@neoglito/web/features/telemetry/metric-series';
import {
  assignServiceTones,
  toneOf,
} from '@neoglito/web/features/telemetry/service-tones';
import {
  selectLogsOfService,
  selectServiceNames,
  selectVisibleTraces,
} from '@neoglito/web/features/telemetry/telemetry.selectors';
import { TelemetryTracesPanel } from '@neoglito/web/features/telemetry/components/telemetry-traces-panel';
import { TelemetryMetricsPanel } from '@neoglito/web/features/telemetry/components/telemetry-metrics-panel';
import { TelemetryLogsPanel } from '@neoglito/web/features/telemetry/components/telemetry-logs-panel';
import { telemetryCardClassName } from '@neoglito/web/features/telemetry/components/telemetry-styles';
import { formatRelativeTime } from '@neoglito/web/shared/utils/relative-time';
import type { TelemetryTab } from '@neoglito/web/features/telemetry/telemetry.reducer';
import type { DeploymentResponse } from '@neoglito/web/shared/api/contracts';
import type { Project } from '@neoglito/web/features/projects/project.model';

const STOPPED_STATUSES = ['stopping', 'stopped', 'failed'];

function statusBadge(status: string) {
  if (status === 'running')
    return {
      label: 'En ejecución',
      className:
        'text-[#1d7a45] bg-[#e6f4ec] dark:text-[#5fcf8f] dark:bg-[#12291d]',
    };
  if (status === 'failed')
    return {
      label: 'Fallido',
      className:
        'text-[#c2453b] bg-[#fbf1f0] dark:text-[#e07a70] dark:bg-[#2a1a19]',
    };
  if (status === 'stopped' || status === 'stopping')
    return {
      label: 'Detenido',
      className:
        'text-[#a4550a] bg-[#fbefe0] dark:text-[#f0a458] dark:bg-[#2d1f10]',
    };
  return {
    label: status,
    className:
      'text-[#51607a] bg-[#f1f5f9] dark:text-[#a7b4c8] dark:bg-[#1a2334]',
  };
}

export function TelemetryView({
  project,
  deployment,
}: {
  project: Project;
  deployment: DeploymentResponse;
}) {
  const state = useTelemetryState();
  const dispatch = useTelemetryDispatch();
  const stopped = STOPPED_STATUSES.includes(deployment.status);
  const live = state.live && !stopped;
  const rangeMs =
    TELEMETRY_RANGES.find((range) => range.key === state.range)?.ms ?? 0;
  const common = { deploymentId: deployment.id, range: state.range, live };

  const spans = useTelemetryPages({ ...common, signal: 'traces' });
  const logs = useTelemetryPages({ ...common, signal: 'logs' });
  const metrics = useTelemetryPages({
    ...common,
    signal: 'metrics',
    enabled: state.tab === 'metrics',
  });

  const tones = assignServiceTones(
    selectServiceNames(spans.items, logs.items, metrics.items),
  );
  const services = Object.keys(tones);
  const traces = selectVisibleTraces(assembleTraces(spans.items), state.service);
  const serviceLogs = selectLogsOfService(logs.items, state.service);
  const series = buildMetricSeries(
    state.service
      ? metrics.items.filter((point) => point.serviceName === state.service)
      : metrics.items,
  );

  const active = { traces: spans, metrics, logs }[state.tab];
  const scope = state.service
    ? `${state.service} no emitió`
    : 'No se recibió';
  const badge = statusBadge(deployment.status);
  const tabs: Array<{ key: TelemetryTab; label: string; count: string }> = [
    { key: 'traces', label: 'Trazas', count: String(traces.length) },
    {
      key: 'metrics',
      label: 'Métricas',
      count: metrics.isPending ? '' : String(series.length),
    },
    { key: 'logs', label: 'Logs', count: String(serviceLogs.length) },
  ];

  return (
    <div className="mx-auto mt-[22px] flex min-h-0 w-full max-w-[1200px] flex-1 flex-col gap-[18px]">
      <div
        className={`${telemetryCardClassName} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}
      >
        <Link
          to={`/projects/${project.id}/analysis?view=saved`}
          className="inline-flex h-[34px] shrink-0 items-center rounded-lg border border-[#d6dce5] bg-white px-3 text-[12.5px] font-semibold text-[#51607a] hover:bg-[#f1f5f9] dark:border-[#2e3a51] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]"
        >
          ← Análisis
        </Link>
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="truncate text-[16px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
            Telemetría · {project.name}
          </span>
          <span className="text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]">
            Deployment{' '}
            <span className="font-mono">{deployment.id.slice(0, 8)}</span> ·
            desplegado{' '}
            {formatRelativeTime(
              new Date(deployment.startedAt ?? deployment.createdAt),
            )}
          </span>
        </span>
        <span
          className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      {stopped && (
        <div className="rounded-[10px] border border-[#e6eaf0] bg-[#fbefe0] px-[18px] py-3.5 text-[13.5px] leading-normal text-[#16202e] dark:border-[#253044] dark:bg-[#2d1f10] dark:text-[#e8edf6]">
          <strong className="text-[#a4550a] dark:text-[#f0a458]">
            Deployment detenido.
          </strong>{' '}
          No llegan datos nuevos; la telemetría guardada sigue disponible hasta
          que se cumpla la retención.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[10px] border border-[#e6eaf0] bg-white p-1 dark:border-[#253044] dark:bg-[#111826]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() =>
                dispatch({ type: 'telemetry-tab-changed', tab: tab.key })
              }
              className={`flex h-[34px] shrink-0 items-center gap-2 whitespace-nowrap rounded-[7px] px-3.5 text-[13px] font-semibold transition-colors ${
                state.tab === tab.key
                  ? 'bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]'
                  : 'text-[#51607a] hover:text-[#16202e] dark:text-[#a7b4c8] dark:hover:text-[#e8edf6]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[11.5px] font-medium text-[#aab3c2] dark:text-[#5f6b7e]">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <div className="flex gap-1 rounded-[9px] border border-[#e6eaf0] bg-white p-[3px] dark:border-[#253044] dark:bg-[#111826]">
          {TELEMETRY_RANGES.map((range) => (
            <button
              key={range.key}
              type="button"
              onClick={() =>
                dispatch({ type: 'telemetry-range-changed', range: range.key })
              }
              className={`h-[30px] rounded-md px-[11px] text-[12.5px] font-semibold transition-colors ${
                state.range === range.key
                  ? 'bg-[#eef3fc] text-[#2257c4] dark:bg-[#18243a] dark:text-[#5b8df5]'
                  : 'text-[#8c98ac] hover:text-[#51607a] dark:text-[#7a8699] dark:hover:text-[#a7b4c8]'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: 'telemetry-live-toggled' })}
          disabled={stopped}
          className={`inline-flex h-9 items-center gap-[7px] rounded-lg border border-[#d6dce5] bg-white px-4 text-[12.5px] font-semibold disabled:opacity-60 dark:border-[#2e3a51] dark:bg-[#111826] ${
            live
              ? 'text-[#1d7a45] dark:text-[#5fcf8f]'
              : 'text-[#8c98ac] dark:text-[#7a8699]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`size-[7px] rounded-full bg-current ${live ? 'animate-pulse' : ''}`}
          />
          {stopped ? 'Sin datos nuevos' : live ? 'En vivo' : 'En pausa'}
        </button>
      </div>

      {services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[null, ...services].map((service) => {
            const on = state.service === service;

            return (
              <button
                key={service ?? 'all'}
                type="button"
                onClick={() =>
                  dispatch({ type: 'telemetry-service-selected', service })
                }
                className={`inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border px-[13px] text-[12.5px] font-semibold transition-colors ${
                  on
                    ? 'border-[#2257c4] bg-[#eef3fc] text-[#2257c4] dark:border-[#5b8df5] dark:bg-[#18243a] dark:text-[#5b8df5]'
                    : 'border-[#e6eaf0] bg-white text-[#51607a] hover:border-[#d6dce5] dark:border-[#253044] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:border-[#2e3a51]'
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    service
                      ? toneOf(tones, service).dotClassName
                      : 'bg-[#aab3c2] dark:bg-[#5f6b7e]'
                  }`}
                />
                {service ?? 'Todos'}
              </button>
            );
          })}
        </div>
      )}

      {active.isPending && (
        <p role="status" className="text-[13px] text-[#8c98ac] dark:text-[#7a8699]">
          Cargando telemetría...
        </p>
      )}
      {active.isError && (
        <div role="alert" className="flex items-center gap-3 text-[13px] text-[#c2453b] dark:text-[#e07a70]">
          <p>{active.error}</p>
          <button
            type="button"
            onClick={active.refetch}
            className="font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {!active.isPending && state.tab === 'traces' && (
        <TelemetryTracesPanel
          traces={traces}
          logs={logs.items}
          tones={tones}
          windowEndMs={spans.loadedAt}
          rangeMs={rangeMs}
          emptyMessage={`${scope} trazas en este rango de tiempo.`}
          hasNextPage={spans.hasNextPage}
          isFetchingNextPage={spans.isFetchingNextPage}
          onLoadMore={spans.fetchNextPage}
        />
      )}
      {!metrics.isPending && state.tab === 'metrics' && (
        <TelemetryMetricsPanel
          series={series}
          tones={tones}
          windowEndMs={metrics.loadedAt}
          rangeMs={rangeMs}
          emptyMessage={`${scope} métricas en este rango de tiempo.`}
        />
      )}
      {!logs.isPending && state.tab === 'logs' && (
        <TelemetryLogsPanel
          logs={serviceLogs}
          tones={tones}
          emptyMessage={`${scope} logs en este rango de tiempo.`}
          hasNextPage={logs.hasNextPage}
          isFetchingNextPage={logs.isFetchingNextPage}
          onLoadMore={logs.fetchNextPage}
        />
      )}
    </div>
  );
}
