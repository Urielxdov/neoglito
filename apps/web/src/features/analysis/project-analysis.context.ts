import { createContext, createElement, useContext } from 'react';
import type { Dispatch, PropsWithChildren } from 'react';
import type { AnalyzeState, AnalysisAction } from './analysis.reducer';
import type { Project } from '@neoglito/web/features/projects/project.model';
import type { ProjectDetailRepositoryInfo } from '@neoglito/web/features/projects/components/detail/project-detail-view';

interface ProjectAnalysisContextValue {
  project: Project;
  repositories: ProjectDetailRepositoryInfo[];
  analyze: AnalyzeState;
  onBack(): void;
}

const StateContext = createContext<ProjectAnalysisContextValue | null>(null);
const DispatchContext = createContext<Dispatch<AnalysisAction> | null>(null);

export function ProjectAnalysisProvider({
  children,
  value,
  dispatch,
}: PropsWithChildren<{
  value: ProjectAnalysisContextValue;
  dispatch: Dispatch<AnalysisAction>;
}>) {
  return createElement(
    StateContext.Provider,
    { value },
    createElement(DispatchContext.Provider, { value: dispatch }, children),
  );
}

export function useProjectAnalysisState() {
  const state = useContext(StateContext);
  if (!state) throw new Error('ProjectAnalysisProvider missing');
  return state;
}

export function useProjectAnalysisDispatch() {
  const dispatch = useContext(DispatchContext);
  if (!dispatch) throw new Error('ProjectAnalysisProvider missing');
  return dispatch;
}
