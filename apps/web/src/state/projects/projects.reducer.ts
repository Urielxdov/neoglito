import type {
  DeploymentResponse,
  ProjectResponse,
} from "@neoglito/web/api/contracts";
import type { Project } from "@neoglito/web/models/project";

export type ProjectsStatus = 'loading' | 'ready' | 'error';
export type ProjectsPhase = 'list' | 'detail' | 'analyze';
export type ProjectsDetailTab = 'deploy' | 'routes' | 'repos' | 'general';

export interface DeployEnvVar {
  key: string;
  value: string;
  required: boolean;
}

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

export interface AnalyzeState {
  projectId: number;
  repos: AnalyzeRepoState[];
  collapsed: Record<number, boolean>;
  selectedKey: string | null;
}

export interface ProjectsState {
  status: ProjectsStatus;
  projects: Project[];
  creating: boolean;
  submitting: boolean;
  newName: string;
  newDescription: string;
  openId: number | null;
  message: string | null;
  phase: ProjectsPhase;
  activeId: number | null;
  progress: CreationProgress | null;
  openDeployKey: string | null;
  deployPaths: Record<string, string>;
  deployPathCandidates: Record<string, string[]>;
  deployEnv: Record<string, DeployEnvVar[]>;
  detailTab: ProjectsDetailTab;
  editName: string | null;
  editDescription: string | null;
  editSubmitting: boolean;
  editSaved: boolean;
  editMessage: string | null;
  analyze: AnalyzeState | null;
}

export type ProjectsAction =
  | { type: 'load-succeeded'; projects: ProjectResponse[] }
  | { type: 'load-failed'; message: string }
  | { type: 'creation-opened' }
  | { type: 'creation-cancelled' }
  | { type: 'name-changed'; name: string }
  | { type: 'description-changed'; description: string }
  | { type: 'creation-submitting' }
  | { type: 'creation-progress'; done: number; total: number; label: string }
  | { type: 'creation-failed'; message: string }
  | { type: 'creation-succeeded'; projectId: number }
  | { type: 'project-opened'; id: number }
  | { type: 'project-closed' }
  | { type: 'detail-opened'; id: number }
  | { type: 'detail-closed' }
  | { type: 'detail-tab-changed'; tab: ProjectsDetailTab }
  | { type: 'deploy-row-toggled'; key: string }
  | { type: 'deploy-path-changed'; key: string; path: string }
  | { type: 'deploy-env-row-added'; key: string }
  | { type: 'deploy-env-row-removed'; key: string; index: number }
  | {
      type: 'deploy-env-row-changed';
      key: string;
      index: number;
      field: 'key' | 'value';
      value: string;
    }
  | { type: 'deploy-paths-discovery-failed'; message: string }
  | {
      type: 'deploy-env-discovered';
      projectId: number;
      envByRepositoryId: Record<number, DeployEnvVar[]>;
    }
  | {
      type: 'deploy-paths-discovered';
      projectId: number;
      pathsByRepositoryId: Record<number, string>;
      candidatesByRepositoryId: Record<number, string[]>;
    }
  | { type: 'edit-name-changed'; name: string }
  | { type: 'edit-description-changed'; description: string }
  | { type: 'edit-reset' }
  | { type: 'edit-submitting' }
  | { type: 'edit-succeeded'; project: ProjectResponse }
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
  | { type: 'analyze-service-selected'; key: string };

export const initialProjectsState: ProjectsState = {
  status: 'loading',
  projects: [],
  creating: false,
  submitting: false,
  newName: '',
  newDescription: '',
  openId: null,
  message: null,
  phase: 'list',
  activeId: null,
  progress: null,
  openDeployKey: null,
  deployPaths: {},
  deployPathCandidates: {},
  deployEnv: {},
  detailTab: 'deploy',
  editName: null,
  editDescription: null,
  editSubmitting: false,
  editSaved: false,
  editMessage: null,
  analyze: null,
};

function toProject(project: ProjectResponse): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
    repositories: project.repositories,
  };
}

export function projectsReducer(
  state: ProjectsState,
  action: ProjectsAction,
): ProjectsState {
  switch (action.type) {
    case 'load-succeeded':
      return {
        ...state,
        status: 'ready',
        projects: action.projects.map(toProject),
      };
    case 'load-failed':
      return { ...state, status: 'error', message: action.message };
    case 'creation-opened':
      return { ...state, creating: true, message: null };
    case 'creation-cancelled':
      return {
        ...state,
        creating: false,
        newName: '',
        newDescription: '',
        message: null,
      };
    case 'name-changed':
      return { ...state, newName: action.name };
    case 'description-changed':
      return { ...state, newDescription: action.description };
    case 'creation-submitting':
      return { ...state, submitting: true, message: null, progress: null };
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
        message: action.message,
        progress: null,
      };
    case 'creation-succeeded':
      return {
        ...state,
        submitting: false,
        creating: false,
        newName: '',
        newDescription: '',
        message: null,
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
        openDeployKey: null,
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
        openDeployKey: null,
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
    case 'deploy-row-toggled':
      return { ...state, openDeployKey: action.key };
    case 'deploy-path-changed':
      return {
        ...state,
        deployPaths: { ...state.deployPaths, [action.key]: action.path },
      };
    case 'deploy-paths-discovered': {
      const deployPaths = { ...state.deployPaths };
      const deployPathCandidates = { ...state.deployPathCandidates };

      for (const [repositoryId, path] of Object.entries(
        action.pathsByRepositoryId,
      )) {
        deployPaths[`${action.projectId}:${repositoryId}`] = path;
      }

      for (const [repositoryId, candidates] of Object.entries(
        action.candidatesByRepositoryId,
      )) {
        deployPathCandidates[`${action.projectId}:${repositoryId}`] =
          candidates;
      }

      return {
        ...state,
        message: null,
        deployPaths,
        deployPathCandidates,
      };
    }
    case 'deploy-paths-discovery-failed':
      return { ...state, message: action.message };
    case 'deploy-env-row-added': {
      const rows = state.deployEnv[action.key] ?? [];

      return {
        ...state,
        deployEnv: {
          ...state.deployEnv,
          [action.key]: [...rows, { key: '', value: '', required: false }],
        },
      };
    }
    case 'deploy-env-row-removed': {
      const rows = state.deployEnv[action.key] ?? [];

      return {
        ...state,
        deployEnv: {
          ...state.deployEnv,
          [action.key]: rows.filter((_, index) => index !== action.index),
        },
      };
    }
    case 'deploy-env-row-changed': {
      const rows = state.deployEnv[action.key] ?? [];

      return {
        ...state,
        deployEnv: {
          ...state.deployEnv,
          [action.key]: rows.map((row, index) =>
            index === action.index
              ? { ...row, [action.field]: action.value }
              : row,
          ),
        },
      };
    }
    case 'deploy-env-discovered': {
      const deployEnv = { ...state.deployEnv };

      for (const [repositoryId, env] of Object.entries(
        action.envByRepositoryId,
      )) {
        deployEnv[`${action.projectId}:${repositoryId}`] = env;
      }

      return { ...state, deployEnv };
    }
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
        projects: state.projects.map((project) =>
          project.id === action.project.id
            ? toProject(action.project)
            : project,
        ),
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
            [action.repositoryId]: !state.analyze.collapsed[
              action.repositoryId
            ],
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
  }
}
