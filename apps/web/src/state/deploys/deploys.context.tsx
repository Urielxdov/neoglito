import { createReducerContext } from '@neoglito/web/state/create-reducer-context';
import {
  deploysReducer,
  initialDeploysState,
} from '@neoglito/web/state/deploys/deploys.reducer';
import type {
  DeploysAction,
  DeploysState,
} from '@neoglito/web/state/deploys/deploys.reducer';

const context = createReducerContext<DeploysState, DeploysAction>(
  'Deploys',
  deploysReducer,
  initialDeploysState,
);

export const DeploysProvider = context.Provider;
export const useDeploysState = context.useState;
export const useDeploysDispatch = context.useDispatch;
