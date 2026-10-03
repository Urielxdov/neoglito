import { createReducerContext } from '@neoglito/web/state/create-reducer-context';
import {
  initialRepositoriesState,
  repositoriesReducer,
} from '@neoglito/web/state/repositories/repositories.reducer';
import type {
  RepositoriesAction,
  RepositoriesState,
} from '@neoglito/web/state/repositories/repositories.reducer';

const context = createReducerContext<RepositoriesState, RepositoriesAction>(
  'Repositories',
  repositoriesReducer,
  initialRepositoriesState,
);

export const RepositoriesProvider = context.Provider;
export const useRepositoriesState = context.useState;
export const useRepositoriesDispatch = context.useDispatch;
