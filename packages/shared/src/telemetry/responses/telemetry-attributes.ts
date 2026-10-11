export type TelemetryJsonValue =
  | string
  | number
  | boolean
  | null
  | TelemetryJsonValue[]
  | { [key: string]: TelemetryJsonValue };

export type TelemetryAttributes = { [key: string]: TelemetryJsonValue };
