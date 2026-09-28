export interface EnvironmentVariable {
  service: string;
  name: string;
  source: 'literal' | 'interpolation';
  value: string | null;
  defaultValue: string | null;
}

export interface ComposeEnvironmentVariablesAnalysis {
  dockerComposePath: string;
  environmentVariables: EnvironmentVariable[];
}

export interface InitProjectResponse {
  clonedRepositoryPaths: string[];
  dockerComposePaths: string[];
  composeAnalyses: ComposeEnvironmentVariablesAnalysis[];
}
