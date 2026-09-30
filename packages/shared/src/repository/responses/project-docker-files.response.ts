import type { EnvironmentVariable } from '@neoglito/shared/repository/responses/init-project.response';

export interface ComposePort {
  service: string;
  hostIp: string | null;
  publishedPort: string | null;
  targetPort: string;
  protocol: string;
  mappingType: 'one-to-one' | 'range';
}

export interface ProjectComposeAnalysis {
  dockerComposePath: string;
  environmentVariables: EnvironmentVariable[];
  ports: ComposePort[];
}

export interface ProjectDockerFilesResponse {
  clonedRepositoryPaths: string[];
  dockerFilesPath: string[];
  composeAnalyses: ProjectComposeAnalysis[];
}
