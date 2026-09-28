import type { DeployComposeRequest } from '@neoglito/shared/repository';
import { ApiProperty } from '@nestjs/swagger';

export class DeployComposeDto implements DeployComposeRequest {
  @ApiProperty({ example: 1 })
  projectId!: number;

  @ApiProperty({ example: 'C:/repos/demo/docker-compose.yml' })
  composePath!: string;
}
