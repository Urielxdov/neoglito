import type { InitProjectRequest } from '@neoglito/shared/repository';
import { ApiProperty } from '@nestjs/swagger';

export class InitProjectDto implements InitProjectRequest {
  @ApiProperty({ example: 1 })
  projectId!: number;
}
