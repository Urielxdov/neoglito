export const TELEMETRY_SIGNALS = ['traces', 'metrics', 'logs'] as const;

export type TelemetrySignal = (typeof TELEMETRY_SIGNALS)[number];
