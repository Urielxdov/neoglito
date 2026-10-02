import type { DeploymentResponse } from '@neoglito/web/api/contracts';

export type ProjectsPhase = 'list' | 'detail' | 'analyze';
export type ProjectsDetailTab = 'deploy' | 'routes' | 'repos' | 'general';

export interface CreationProgress {
  done: number;
  total: number;
  label: string;
}

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

export interface ProjectsState {
  creating: boolean;
  submitting: boolean;
  newName: string;
  newDescription: string;
  openId: number | null;
  phase: ProjectsPhase;
  activeId: number | null;
  progress: CreationProgress | null;
  detailTab: ProjectsDetailTab;
  editName: string | null;
  editDescription: string | null;
  editSubmitting: boolean;
  editSaved: boolean;
  editMessage: string | null;
  analyze: AnalyzeState | null;
}

export type ProjectsAction =
  | { type: 'creation-opened' }
  | { type: 'creation-cancelled' }
  | { type: 'name-changed'; name: string }
  | { type: 'description-changed'; description: string }
  | { type: 'creation-submitting' }
  | { type: 'creation-progress'; done: number; total: number; label: string }
  | { type: 'creation-failed' }
  | { type: 'creation-succeeded'; projectId: number }
  | { type: 'project-opened'; id: number }
  | { type: 'project-closed' }
  | { type: 'detail-opened'; id: number }
  | { type: 'detail-closed' }
  | { type: 'detail-tab-changed'; tab: ProjectsDetailTab }
  | { type: 'edit-name-changed'; name: string }
  | { type: 'edit-description-changed'; description: string }
  | { type: 'edit-reset' }
  | { type: 'edit-submitting' }
  | { type: 'edit-succeeded' }
  | { type: 'edit-failed'; message: string }
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

export const initialProjectsState: ProjectsState = {
  creating: false,
  submitting: false,
  newName: '',
  newDescription: '',
  openId: null,
  phase: 'list',
  activeId: null,
  progress: null,
  detailTab: 'deploy',
  editName: null,
  editDescription: null,
  editSubmitting: false,
  editSaved: false,
  editMessage: null,
  analyze: null,
};

export function projectsReducer(
  state: ProjectsState,
  action: ProjectsAction,
): ProjectsState {
  switch (action.type) {
    case 'creation-opened':
      return { ...state, creating: true };
    case 'creation-cancelled':
      return {
        ...state,
        creating: false,
        newName: '',
        newDescription: '',
      };
    case 'name-changed':
      return { ...state, newName: action.name };
    case 'description-changed':
      return { ...state, newDescription: action.description };
    case 'creation-submitting':
      return { ...state, submitting: true, progress: null };
    case 'creation-progress':
      return {
        ...state,
        progress: {
          done: action.done,
          total: action.total,
          label: action.label,
        },
      };
    case 'creation-failed':
      return {
        ...state,
        submitting: false,
        progress: null,
      };
    case 'creation-succeeded':
      return {
        ...state,
        submitting: false,
        creating: false,
        newName: '',
        newDescription: '',
        progress: null,
        phase: 'detail',
        activeId: action.projectId,
      };
    case 'project-opened':
      return { ...state, openId: action.id };
    case 'project-closed':
      return { ...state, openId: null };
    case 'detail-opened':
      return {
        ...state,
        phase: 'detail',
        activeId: action.id,
        openId: null,
        detailTab: 'deploy',
        editName: null,
        editDescription: null,
        editSaved: false,
        editMessage: null,
      };
    case 'detail-closed':
      return {
        ...state,
        phase: 'list',
        activeId: null,
        detailTab: 'deploy',
        editName: null,
        editDescription: null,
        editSaved: false,
        editMessage: null,
      };
    case 'detail-tab-changed':
      return {
        ...state,
        detailTab: action.tab,
        editSaved: false,
        editMessage: null,
      };
    case 'edit-name-changed':
      return { ...state, editName: action.name, editSaved: false };
    case 'edit-description-changed':
      return {
        ...state,
        editDescription: action.description,
        editSaved: false,
      };
    case 'edit-reset':
      return {
        ...state,
        editName: null,
        editDescription: null,
        editSaved: false,
        editMessage: null,
      };
    case 'edit-submitting':
      return { ...state, editSubmitting: true, editMessage: null };
    case 'edit-succeeded':
      return {
        ...state,
        editSubmitting: false,
        editName: null,
        editDescription: null,
        editSaved: true,
        editMessage: null,
      };
    case 'edit-failed':
      return { ...state, editSubmitting: false, editMessage: action.message };
    case 'analyze-opened':
      return {
        ...state,
        phase: 'analyze',
        analyze: {
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
        },
      };
    case 'analyze-closed':
      return {
        ...state,
        phase: 'detail',
        analyze: null,
        detailTab: 'deploy',
      };
    case 'analyze-repo-succeeded': {
      if (!state.analyze) return state;

      return {
        ...state,
        analyze: {
          ...state.analyze,
          repos: state.analyze.repos.map((repo) =>
            repo.repositoryId === action.repositoryId
              ? {
                  ...repo,
                  status: 'succeeded',
                  deployment: action.deployment,
                  message: null,
                }
              : repo,
          ),
        },
      };
    }
    case 'analyze-repo-failed': {
      if (!state.analyze) return state;

      return {
        ...state,
        analyze: {
          ...state.analyze,
          repos: state.analyze.repos.map((repo) =>
            repo.repositoryId === action.repositoryId
              ? {
                  ...repo,
                  status: 'failed',
                  deployment: null,
                  message: action.message,
                }
              : repo,
          ),
        },
      };
    }
    case 'analyze-group-toggled': {
      if (!state.analyze) return state;

      return {
        ...state,
        analyze: {
          ...state.analyze,
          collapsed: {
            ...state.analyze.collapsed,
            [action.repositoryId]:
              !state.analyze.collapsed[action.repositoryId],
          },
        },
      };
    }
    case 'analyze-service-selected': {
      if (!state.analyze) return state;

      return {
        ...state,
        analyze: { ...state.analyze, selectedKey: action.key },
      };
    }
    case 'analyze-tab-changed': {
      if (!state.analyze) return state;

      return {
        ...state,
        analyze: { ...state.analyze, tab: action.tab },
      };
    }
  }
}
