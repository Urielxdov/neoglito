export const MAX_TELEMETRY_PAGE_SIZE = 500;
export const DEFAULT_TELEMETRY_PAGE_SIZE = 100;

export interface TelemetryPage<T> {
  items: T[];
  /** Cursor para la siguiente página; null si no hay más registros. */
  nextBefore: string | null;
}
