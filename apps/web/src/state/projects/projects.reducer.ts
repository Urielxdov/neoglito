import type { ProjectResponse } from "@neoglito/web/api/contracts";
import type { Project } from "@neoglito/web/models/project";

export type ProjectsStatus = 'loading' | 'ready' | 'error';
export type ProjectsPhase = 'list' | 'detail';
export type ProjectsDetailTab = 'deploy' | 'routes' | 'repos';

export interface DeployEnvVar {
  key: string;
  value: string;
}

export interface CreationProgress {
  done: number;
  total: number;
  label: string;
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
  configuredProjectIds: Set<number>;
  detailTab: ProjectsDetailTab;
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
  | { type: 'deploy-configured'; projectId: number }
  | { type: 'deploy-paths-discovery-failed'; message: string }
  | {
      type: 'deploy-paths-discovered';
      projectId: number;
      pathsByRepositoryId: Record<number, string>;
      candidatesByRepositoryId: Record<number, string[]>;
    };

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
  configuredProjectIds: new Set(),
  detailTab: 'deploy',
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

function projectIdFromKey(key: string): number {
  return Number(key.split(':')[0]);
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
      };
    case 'detail-closed':
      return {
        ...state,
        phase: 'list',
        activeId: null,
        openDeployKey: null,
        detailTab: 'deploy',
      };
    case 'detail-tab-changed':
      return { ...state, detailTab: action.tab };
    case 'deploy-row-toggled':
      return {
        ...state,
        openDeployKey: state.openDeployKey === action.key ? null : action.key,
      };
    case 'deploy-path-changed': {
      const projectId = projectIdFromKey(action.key);
      const configuredProjectIds = new Set(state.configuredProjectIds);
      configuredProjectIds.delete(projectId);

      return {
        ...state,
        deployPaths: { ...state.deployPaths, [action.key]: action.path },
        configuredProjectIds,
      };
    }
    case 'deploy-paths-discovered': {
      const deployPaths = { ...state.deployPaths };
      const deployPathCandidates = { ...state.deployPathCandidates };
      const configuredProjectIds = new Set(state.configuredProjectIds);
      configuredProjectIds.delete(action.projectId);

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
        configuredProjectIds,
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
          [action.key]: [...rows, { key: '', value: '' }],
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
    case 'deploy-configured': {
      const configuredProjectIds = new Set(state.configuredProjectIds);
      configuredProjectIds.add(action.projectId);

      return { ...state, configuredProjectIds };
    }
  }
}
