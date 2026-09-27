import { ApiProperty } from '@nestjs/swagger';

export class DeployComposeDto {
  @ApiProperty({ example: 1 })
  projectId!: number;

  @ApiProperty({ example: 'C:/repos/demo/docker-compose.yml' })
  composePath!: string;
}
