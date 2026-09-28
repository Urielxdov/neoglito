import type { ComposeEnvironmentVariablesAnalysis } from '@neoglito/shared/repository/responses/init-project.response';

export interface ProjectDockerFilesResponse {
  clonedRepositoryPaths: string[];
  dockerFilesPath: string[];
  composeAnalyses: ComposeEnvironmentVariablesAnalysis[];
}
