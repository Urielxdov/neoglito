import { createReducerContext } from '@neoglito/web/state/create-reducer-context';
import {
  analysisReducer,
  initialAnalysisState,
} from '@neoglito/web/state/analysis/analysis.reducer';
import type {
  AnalysisAction,
  AnalysisState,
} from '@neoglito/web/state/analysis/analysis.reducer';

const context = createReducerContext<AnalysisState, AnalysisAction>(
  'Analysis',
  analysisReducer,
  initialAnalysisState,
);

export const AnalysisProvider = context.Provider;
export const useAnalysisState = context.useState;
export const useAnalysisDispatch = context.useDispatch;
