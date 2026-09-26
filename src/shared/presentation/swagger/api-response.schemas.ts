import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiProperty, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export class ApiErrorSchema {
  @ApiProperty({ example: 'INTERNAL_ERROR' })
  code!: string;

  @ApiProperty({ example: 'Ocurrió un error' })
  message!: string;

  @ApiProperty({ required: false, nullable: true, type: Object, additionalProperties: true })
  details?: unknown;
}

export class ApiMetaSchema {
  @ApiProperty({ required: false, example: 1 })
  page?: number;

  @ApiProperty({ required: false, example: 20 })
  limit?: number;

  @ApiProperty({ required: false, example: 100 })
  total?: number;
}

export class ApiSuccessEnvelopeSchema {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ type: 'object', additionalProperties: true })
  data!: unknown;

  @ApiProperty({ type: () => ApiErrorSchema, nullable: true, example: null })
  error!: ApiErrorSchema | null;

  @ApiProperty({ type: () => ApiMetaSchema, nullable: true, example: null })
  meta!: ApiMetaSchema | null;
}

export class ProjectCreatedSchema {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Ecommerce' })
  name!: string;

  @ApiProperty({ example: 'Tienda para tu computadora' })
  description!: string;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-09-26T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-09-26T12:00:00.000Z' })
  updatedAt!: string;
}

export class ProjectRepositorySchema {
  @ApiProperty({ example: 10 })
  id!: number;

  @ApiProperty({ example: 'neoglito-api' })
  name!: string;
}

export class ProjectSchema extends ProjectCreatedSchema {
  @ApiProperty({ type: () => [ProjectRepositorySchema] })
  repositories!: ProjectRepositorySchema[];
}

export class EnvironmentVariableSchema {
  @ApiProperty({ example: 'api' })
  service!: string;

  @ApiProperty({ example: 'DATABASE_URL' })
  name!: string;

  @ApiProperty({ enum: ['literal', 'interpolation'], example: 'interpolation' })
  source!: 'literal' | 'interpolation';

  @ApiProperty({ type: String, nullable: true, example: null })
  value!: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  defaultValue!: string | null;
}

export class ComposeAnalysisSchema {
  @ApiProperty({ example: 'C:/repos/neoglito/docker-compose.yml' })
  dockerComposePath!: string;

  @ApiProperty({ type: () => [EnvironmentVariableSchema] })
  environmentVariables!: EnvironmentVariableSchema[];
}

export class InitProjectDataSchema {
  @ApiProperty({ type: [String], example: ['C:/repos/neoglito/backend'] })
  clonedRepositoryPaths!: string[];

  @ApiProperty({ type: [String], example: ['C:/repos/neoglito/backend/docker-compose.yml'] })
  dockerComposePaths!: string[];

  @ApiProperty({ type: () => [ComposeAnalysisSchema] })
  composeAnalyses!: ComposeAnalysisSchema[];
}

export class ProjectDockerFilesDataSchema {
  @ApiProperty({ type: [String], example: ['C:/repos/neoglito/backend'] })
  clonedRepositoryPaths!: string[];

  @ApiProperty({ type: [String], example: ['C:/repos/neoglito/backend/docker-compose.yml'] })
  dockerFilesPath!: string[];

  @ApiProperty({ type: () => [ComposeAnalysisSchema] })
  composeAnalyses!: ComposeAnalysisSchema[];
}

export class CreateRepositoryDataSchema {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  projectId!: number;

  @ApiProperty({ example: 'neoglito-api' })
  name!: string;

  @ApiProperty({ example: 'https://github.com/example/neoglito-api.git' })
  gitUrl!: string;

  @ApiProperty({ example: 'https://github.com/example/neoglito-api.git' })
  cloneUrl!: string;
}

export class CloneRepositoryDataSchema {
  @ApiProperty({ example: 'C:/repos/neoglito-api' })
  pathSystem!: string;
}

export class GitHubRepositorySchema {
  @ApiProperty({ example: 123456 })
  id!: number;

  @ApiProperty({ example: 'example/neoglito-api' })
  name!: string;

  @ApiProperty({ example: false })
  private!: boolean;

  @ApiProperty({ example: 'Backend API for Neoglito' })
  description!: string;

  @ApiProperty({ example: 'TypeScript' })
  language!: string;

  @ApiProperty({ example: 'git://github.com/example/neoglito-api.git' })
  gitUrl!: string;

  @ApiProperty({ example: 'https://github.com/example/neoglito-api.git' })
  cloneUrl!: string;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-09-26T12:00:00.000Z' })
  updatedAt!: string;
}

export class AuthenticatedUserSchema {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'octocat' })
  username!: string;
}

interface ApiSuccessResponseOptions {
  status: number;
  description: string;
  dataSchema: Record<string, unknown>;
  extraModels?: Function[];
}

export function ApiSuccessResponseDoc({
  status,
  description,
  dataSchema,
  extraModels = [],
}: ApiSuccessResponseOptions) {
  return applyDecorators(
    ApiExtraModels(ApiSuccessEnvelopeSchema, ApiErrorSchema, ApiMetaSchema, ...extraModels),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiSuccessEnvelopeSchema) },
          { type: 'object', properties: { data: dataSchema } },
        ],
      },
    }),
  );
}