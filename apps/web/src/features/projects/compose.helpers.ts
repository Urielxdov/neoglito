import type { ProjectDockerFilesResponse } from '@neoglito/web/shared/api/contracts';
import type { Repository } from '@neoglito/web/features/repositories/repository.model';
import type {
  DeployComposePort,
  DeployEnvVar,
} from '@neoglito/web/features/deploys/deploys.reducer';
import { shortName } from '@neoglito/web/features/repositories/repository-name';

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/$/, '');
}

function getPathBasename(path: string): string {
  return normalizePath(path).split('/').filter(Boolean).at(-1) ?? '';
}

export function getMissingRequiredEnvCount(rows: DeployEnvVar[]): number {
  return rows.filter((row) => row.required && row.value.trim().length === 0)
    .length;
}

export function getDockerFileCandidatesByRepositoryId(
  repositories: Repository[],
  clonedRepositoryPaths: string[],
  dockerFilesPath: string[],
): Record<number, string[]> {
  const candidatesByRepositoryId: Record<number, string[]> = {};
  const normalizedClonedPaths = clonedRepositoryPaths.map((path) => ({
    original: path,
    normalized: normalizePath(path),
    name: getPathBasename(path).toLowerCase(),
  }));
  const normalizedDockerFilesPath = dockerFilesPath.map((path) => ({
    original: path,
    normalized: normalizePath(path),
  }));

  for (const repository of repositories) {
    const repositoryName = shortName(repository.name).toLowerCase();
    const clonedRepositoryPath = normalizedClonedPaths.find(
      (path) => path.name === repositoryName,
    );

    if (!clonedRepositoryPath) {
      continue;
    }

    const candidates = normalizedDockerFilesPath
      .filter((path) =>
        path.normalized.startsWith(`${clonedRepositoryPath.normalized}/`),
      )
      .map((path) => path.original);

    if (candidates.length > 0) {
      candidatesByRepositoryId[repository.id] = candidates;
    }
  }

  return candidatesByRepositoryId;
}

export function getDockerFilePathsByRepositoryId(
  repositories: Repository[],
  clonedRepositoryPaths: string[],
  dockerFilesPath: string[],
  composeAnalyses: ProjectDockerFilesResponse['composeAnalyses'] = [],
): Record<number, string> {
  const candidatesByRepositoryId = getDockerFileCandidatesByRepositoryId(
    repositories,
    clonedRepositoryPaths,
    dockerFilesPath,
  );
  const normalizedComposeAnalyses = composeAnalyses.map((analysis) => ({
    normalized: normalizePath(analysis.dockerComposePath),
    hasData:
      analysis.environmentVariables.length > 0 || analysis.ports.length > 0,
  }));
  const pathsByRepositoryId: Record<number, string> = {};

  for (const [repositoryId, candidates] of Object.entries(
    candidatesByRepositoryId,
  )) {
    // Prefiere el candidato que sí trae variables/puertos; si ninguno trae
    // datos (o aún no se analizaron), cae al primero.
    const withData = candidates.find((candidate) => {
      const normalizedCandidate = normalizePath(candidate);
      return normalizedComposeAnalyses.some(
        (analysis) =>
          analysis.normalized === normalizedCandidate && analysis.hasData,
      );
    });
    pathsByRepositoryId[Number(repositoryId)] = withData ?? candidates[0];
  }

  return pathsByRepositoryId;
}

export function getEnvironmentVariablesByRepositoryId(
  repositories: Repository[],
  clonedRepositoryPaths: string[],
  composeAnalyses: ProjectDockerFilesResponse['composeAnalyses'],
): Record<number, DeployEnvVar[]> {
  const envByRepositoryId: Record<number, DeployEnvVar[]> = {};
  const normalizedClonedPaths = clonedRepositoryPaths.map((path) => ({
    normalized: normalizePath(path),
    name: getPathBasename(path).toLowerCase(),
  }));
  const normalizedComposeAnalyses = composeAnalyses.map((analysis) => ({
    ...analysis,
    normalized: normalizePath(analysis.dockerComposePath),
  }));

  for (const repository of repositories) {
    const repositoryName = shortName(repository.name).toLowerCase();
    const clonedRepositoryPath = normalizedClonedPaths.find(
      (path) => path.name === repositoryName,
    );

    if (!clonedRepositoryPath) {
      continue;
    }

    const env = normalizedComposeAnalyses
      .filter((analysis) =>
        analysis.normalized.startsWith(`${clonedRepositoryPath.normalized}/`),
      )
      .flatMap((analysis) =>
        analysis.environmentVariables.map((variable) => ({
          service: variable.service,
          dockerComposePath: analysis.dockerComposePath,
          key: variable.name,
          value:
            variable.source === 'literal'
              ? (variable.value ?? '')
              : (variable.defaultValue ?? ''),
          required:
            variable.source === 'interpolation' &&
            variable.defaultValue === null,
        })),
      );

    if (env.length > 0) {
      envByRepositoryId[repository.id] = env;
    }
  }

  return envByRepositoryId;
}

export function getComposePortsByRepositoryId(
  repositories: Repository[],
  clonedRepositoryPaths: string[],
  composeAnalyses: ProjectDockerFilesResponse['composeAnalyses'],
): Record<number, DeployComposePort[]> {
  const portsByRepositoryId: Record<number, DeployComposePort[]> = {};
  const normalizedClonedPaths = clonedRepositoryPaths.map((path) => ({
    normalized: normalizePath(path),
    name: getPathBasename(path).toLowerCase(),
  }));
  const normalizedComposeAnalyses = composeAnalyses.map((analysis) => ({
    ...analysis,
    normalized: normalizePath(analysis.dockerComposePath),
  }));

  for (const repository of repositories) {
    const repositoryName = shortName(repository.name).toLowerCase();
    const clonedRepositoryPath = normalizedClonedPaths.find(
      (path) => path.name === repositoryName,
    );

    if (!clonedRepositoryPath) {
      continue;
    }

    const ports = normalizedComposeAnalyses
      .filter((analysis) =>
        analysis.normalized.startsWith(`${clonedRepositoryPath.normalized}/`),
      )
      .flatMap((analysis) =>
        analysis.ports.map((port) => ({
          ...port,
          dockerComposePath: analysis.dockerComposePath,
        })),
      );

    if (ports.length > 0) {
      portsByRepositoryId[repository.id] = ports;
    }
  }

  return portsByRepositoryId;
}
