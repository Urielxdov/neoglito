import type { ReservePortRequest } from '@neoglito/shared/ports';
import { ApiProperty } from '@nestjs/swagger';

export class ReservePortDto implements ReservePortRequest {
  @ApiProperty({ example: 1 })
  projectId!: number;

  @ApiProperty({ example: 5173, minimum: 1, maximum: 65535 })
  port!: number;
}
