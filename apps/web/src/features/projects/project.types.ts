import type { ComposePort } from '@neoglito/web/shared/api/contracts';

export interface ProjectDetailRepository {
  id: number;
  full: string;
  description: string;
  language: string;
  visibility: string;
  shared: string;
}

export interface ProjectDetailRepositoryInfo {
  id: number;
  name: string;
  language: string;
}

export interface DeployEnvVar {
  key: string;
  value: string;
  required: boolean;
}

export interface DeployComposePort extends ComposePort {
  dockerComposePath: string;
}
