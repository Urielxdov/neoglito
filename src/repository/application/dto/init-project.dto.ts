import type { InitProjectRequest } from '@neoglito/shared/repository';

export class InitProjectDto implements InitProjectRequest {
  projectId!: number;
}
