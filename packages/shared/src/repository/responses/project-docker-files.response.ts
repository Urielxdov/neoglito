import type { ComposeEnvironmentVariablesAnalysis } from './init-project.response.js';

export interface ProjectDockerFilesResponse {
  clonedRepositoryPaths: string[];
  dockerFilesPath: string[];
  composeAnalyses: ComposeEnvironmentVariablesAnalysis[];
}
