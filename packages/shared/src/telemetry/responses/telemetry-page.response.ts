export interface TelemetryPageResponse<T> {
  items: T[];
  /** Cursor (`before`) para la siguiente página; null si no hay más registros. */
  nextBefore: string | null;
}
