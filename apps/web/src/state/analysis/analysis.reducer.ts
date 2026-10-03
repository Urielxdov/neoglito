import type { DeploymentResponse } from '@neoglito/web/api/contracts';

export type AnalyzeRepoStatus = 'pending' | 'succeeded' | 'failed';

export interface AnalyzeRepoState {
  repositoryId: number;
  status: AnalyzeRepoStatus;
  deployment: DeploymentResponse | null;
  message: string | null;
}

export type AnalyzeTab = 'services' | 'relations';

export interface AnalyzeState {
  projectId: number;
  repos: AnalyzeRepoState[];
  collapsed: Record<number, boolean>;
  selectedKey: string | null;
  tab: AnalyzeTab;
}

export type AnalysisState = AnalyzeState | null;

export type AnalysisAction =
  | { type: 'analyze-opened'; projectId: number; repositoryIds: number[] }
  | { type: 'analyze-closed' }
  | {
      type: 'analyze-repo-succeeded';
      repositoryId: number;
      deployment: DeploymentResponse;
    }
  | { type: 'analyze-repo-failed'; repositoryId: number; message: string }
  | { type: 'analyze-group-toggled'; repositoryId: number }
  | { type: 'analyze-service-selected'; key: string }
  | { type: 'analyze-tab-changed'; tab: AnalyzeTab };

export const initialAnalysisState: AnalysisState = null;

export function analysisReducer(
  state: AnalysisState,
  action: AnalysisAction,
): AnalysisState {
  switch (action.type) {
    case 'analyze-opened':
      return {
        projectId: action.projectId,
        repos: action.repositoryIds.map((repositoryId) => ({
          repositoryId,
          status: 'pending',
          deployment: null,
          message: null,
        })),
        collapsed: {},
        selectedKey: null,
        tab: 'services',
      };
    case 'analyze-closed':
      return null;
    case 'analyze-repo-succeeded': {
      if (!state) return state;

      return {
        ...state,
        repos: state.repos.map((repo) =>
          repo.repositoryId === action.repositoryId
            ? {
                ...repo,
                status: 'succeeded',
                deployment: action.deployment,
                message: null,
              }
            : repo,
        ),
      };
    }
    case 'analyze-repo-failed': {
      if (!state) return state;

      return {
        ...state,
        repos: state.repos.map((repo) =>
          repo.repositoryId === action.repositoryId
            ? {
                ...repo,
                status: 'failed',
                deployment: null,
                message: action.message,
              }
            : repo,
        ),
      };
    }
    case 'analyze-group-toggled': {
      if (!state) return state;

      return {
        ...state,
        collapsed: {
          ...state.collapsed,
          [action.repositoryId]: !state.collapsed[action.repositoryId],
        },
      };
    }
    case 'analyze-service-selected': {
      if (!state) return state;

      return { ...state, selectedKey: action.key };
    }
    case 'analyze-tab-changed': {
      if (!state) return state;

      return { ...state, tab: action.tab };
    }
  }
}
