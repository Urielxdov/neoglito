import { createReducerContext } from '@neoglito/web/shared/state/create-reducer-context';
import {
  initialTelemetryState,
  telemetryReducer,
} from '@neoglito/web/features/telemetry/telemetry.reducer';
import type {
  TelemetryAction,
  TelemetryState,
} from '@neoglito/web/features/telemetry/telemetry.reducer';

const context = createReducerContext<TelemetryState, TelemetryAction>(
  'Telemetry',
  telemetryReducer,
  initialTelemetryState,
);

export const TelemetryProvider = context.Provider;
export const useTelemetryState = context.useState;
export const useTelemetryDispatch = context.useDispatch;
