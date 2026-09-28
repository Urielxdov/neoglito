export const ENVIROMENT_VARIABLE_EXTRACT_PORT = Symbol(
  'ENVIROMENT_VARIABLE_EXTRACT_PORT',
);

export interface ComposeAnalysis {
  environmentVariables: EnvironmentVariable[];
}

export interface EnvironmentVariable {
  service: string;
  name: string;
  source: 'literal' | 'interpolation';
  value: string | null;
  defaultValue: string | null;
}

export interface EnviromentVariableExtractPort {
  analyze(filePath: string): Promise<ComposeAnalysis>;
}
