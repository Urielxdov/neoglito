import type { ComposePort } from '@neoglito/web/api/contracts';

export interface DeployEnvVar {
  key: string;
  value: string;
  required: boolean;
}

export interface DeployComposePort extends ComposePort {
  dockerComposePath: string;
}

export interface DeploysState {
  openDeployKey: string | null;
  deployPaths: Record<string, string>;
  deployPathCandidates: Record<string, string[]>;
  deployEnv: Record<string, DeployEnvVar[]>;
  deployPorts: Record<string, DeployComposePort[]>;
}

export type DeploysAction =
  | { type: 'deploy-row-toggled'; key: string }
  | { type: 'deploy-row-closed' }
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
  | {
      type: 'deploy-env-discovered';
      projectId: number;
      envByRepositoryId: Record<number, DeployEnvVar[]>;
    }
  | {
      type: 'deploy-ports-discovered';
      projectId: number;
      portsByRepositoryId: Record<number, DeployComposePort[]>;
    }
  | {
      type: 'deploy-port-changed';
      key: string;
      dockerComposePath: string;
      index: number;
      publishedPort: string;
    }
  | {
      type: 'deploy-paths-discovered';
      projectId: number;
      pathsByRepositoryId: Record<number, string>;
      candidatesByRepositoryId: Record<number, string[]>;
    };

export const initialDeploysState: DeploysState = {
  openDeployKey: null,
  deployPaths: {},
  deployPathCandidates: {},
  deployEnv: {},
  deployPorts: {},
};

export function deploysReducer(
  state: DeploysState,
  action: DeploysAction,
): DeploysState {
  switch (action.type) {
    case 'deploy-row-toggled':
      return { ...state, openDeployKey: action.key };
    case 'deploy-row-closed':
      return { ...state, openDeployKey: null };
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
        deployPaths,
        deployPathCandidates,
      };
    }
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
    case 'deploy-ports-discovered': {
      const deployPorts = { ...state.deployPorts };

      for (const [repositoryId, ports] of Object.entries(
        action.portsByRepositoryId,
      )) {
        deployPorts[`${action.projectId}:${repositoryId}`] = ports;
      }

      return { ...state, deployPorts };
    }
    case 'deploy-port-changed': {
      const ports = state.deployPorts[action.key] ?? [];

      return {
        ...state,
        deployPorts: {
          ...state.deployPorts,
          [action.key]: ports.map((port, index) =>
            port.dockerComposePath === action.dockerComposePath &&
            index === action.index
              ? { ...port, publishedPort: action.publishedPort || null }
              : port,
          ),
        },
      };
    }
    default: {
      const _exhaustive: never = action;
      throw new Error(`Acción desconocida en deploysReducer: ${_exhaustive}`);
    }
  }
}
