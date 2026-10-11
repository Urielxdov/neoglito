export type TelemetryTab = 'traces' | 'metrics' | 'logs';

export type TelemetryRange = '15m' | '1h' | '6h' | '24h';

export const TELEMETRY_RANGES: ReadonlyArray<{
  key: TelemetryRange;
  label: string;
  ms: number;
}> = [
  { key: '15m', label: '15 min', ms: 15 * 60_000 },
  { key: '1h', label: '1 h', ms: 60 * 60_000 },
  { key: '6h', label: '6 h', ms: 6 * 60 * 60_000 },
  { key: '24h', label: '24 h', ms: 24 * 60 * 60_000 },
];

export interface TelemetryState {
  tab: TelemetryTab;
  range: TelemetryRange;
  service: string | null;
  selectedTraceId: string | null;
  selectedSpanId: string | null;
  logSeverity: string | null;
  logQuery: string;
  live: boolean;
}

export type TelemetryAction =
  | { type: 'telemetry-tab-changed'; tab: TelemetryTab }
  | { type: 'telemetry-range-changed'; range: TelemetryRange }
  | { type: 'telemetry-service-selected'; service: string | null }
  | { type: 'telemetry-trace-selected'; traceId: string }
  | { type: 'telemetry-span-toggled'; traceId: string; spanId: string }
  | { type: 'telemetry-trace-opened'; traceId: string; spanId: string | null }
  | { type: 'telemetry-log-severity-changed'; severity: string | null }
  | { type: 'telemetry-log-query-changed'; query: string }
  | { type: 'telemetry-live-toggled' };

export const initialTelemetryState: TelemetryState = {
  tab: 'traces',
  range: '1h',
  service: null,
  selectedTraceId: null,
  selectedSpanId: null,
  logSeverity: null,
  logQuery: '',
  live: true,
};

export function telemetryReducer(
  state: TelemetryState,
  action: TelemetryAction,
): TelemetryState {
  switch (action.type) {
    case 'telemetry-tab-changed':
      return { ...state, tab: action.tab };
    case 'telemetry-range-changed':
      return { ...state, range: action.range };
    case 'telemetry-service-selected':
      return {
        ...state,
        service: action.service,
        selectedTraceId: null,
        selectedSpanId: null,
      };
    case 'telemetry-trace-selected':
      return {
        ...state,
        selectedTraceId: action.traceId,
        selectedSpanId: null,
      };
    case 'telemetry-span-toggled':
      return {
        ...state,
        selectedTraceId: action.traceId,
        selectedSpanId:
          state.selectedSpanId === action.spanId ? null : action.spanId,
      };
    case 'telemetry-trace-opened':
      return {
        ...state,
        tab: 'traces',
        selectedTraceId: action.traceId,
        selectedSpanId: action.spanId,
      };
    case 'telemetry-log-severity-changed':
      return { ...state, logSeverity: action.severity };
    case 'telemetry-log-query-changed':
      return { ...state, logQuery: action.query };
    case 'telemetry-live-toggled':
      return { ...state, live: !state.live };
    default: {
      const _exhaustive: never = action;
      throw new Error(`Acción desconocida en telemetryReducer: ${_exhaustive}`);
    }
  }
}
