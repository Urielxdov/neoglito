import type { ProjectComposeFilesRequest } from '@neoglito/shared/repository';
import { ApiProperty } from '@nestjs/swagger';

export class ProjectComposeFilesDto implements ProjectComposeFilesRequest {
  @ApiProperty({
    example: 1,
    description: 'ID del proyecto cuyos repositorios se analizarán',
  })
  projectId!: number;
}
