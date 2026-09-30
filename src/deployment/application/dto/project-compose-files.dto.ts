import { ApiProperty } from '@nestjs/swagger';

export class ProjectComposeFilesDto {
  @ApiProperty({
    example: 1,
    description: 'ID del proyecto cuyos repositorios se analizarán',
  })
  projectId!: number;
}
