import type {
  ComposePort,
  DeployComposeRequest,
  DeployComposeEnvironmentVariable,
} from '@neoglito/shared/repository';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComposePortSchema } from '../../../shared/presentation/swagger/api-response.schemas.js';

export class DeployEnvironmentVariableDto implements DeployComposeEnvironmentVariable {
  @ApiPropertyOptional({
    example: 'api',
    description: 'Si se omite, se aplica a todos los servicios',
  })
  service?: string;

  @ApiProperty({ example: 'DATABASE_URL' })
  key!: string;

  @ApiProperty({ example: 'postgresql://postgres:5432/app' })
  value!: string;
}

export class DeployComposeDto implements DeployComposeRequest {
  @ApiProperty({ example: 1 })
  projectId!: number;

  @ApiProperty({ example: 'C:/repos/demo/docker-compose.yml' })
  composePath!: string;

  @ApiPropertyOptional({ type: [DeployEnvironmentVariableDto] })
  environment?: DeployEnvironmentVariableDto[];

  @ApiPropertyOptional({ type: [ComposePortSchema] })
  ports?: ComposePort[];

  @ApiPropertyOptional({
    example: true,
    description:
      'Usar el puerto elegido tanto en el host como en el listener del contenedor',
  })
  mirrorPorts?: boolean;
}
