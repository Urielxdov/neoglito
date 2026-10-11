import {
  applyDecorators,
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/passport/jwt-auth.guard.js';
import {
  QueryDeploymentTelemetryUseCase,
  type TelemetryFilters,
} from '../application/use-cases/query-deployment-telemetry.use-case.js';

function parseDate(name: string, value: string | undefined): Date | undefined {
  if (value === undefined || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new BadRequestException(`${name} debe ser una fecha ISO válida`);
  return date;
}

function parseFilters(
  query: Record<string, string | undefined>,
): TelemetryFilters {
  const limit =
    query.limit === undefined || query.limit === ''
      ? undefined
      : Number(query.limit);
  if (limit !== undefined && !Number.isFinite(limit))
    throw new BadRequestException('limit debe ser numérico');
  return {
    service: query.service || undefined,
    from: parseDate('from', query.from),
    to: parseDate('to', query.to),
    before: parseDate('before', query.before),
    limit,
  };
}

const filterDocs = [
  ApiQuery({ name: 'service', required: false }),
  ApiQuery({ name: 'from', required: false, description: 'Fecha ISO' }),
  ApiQuery({ name: 'to', required: false, description: 'Fecha ISO' }),
  ApiQuery({
    name: 'before',
    required: false,
    description: 'Cursor: `nextBefore` de la página anterior',
  }),
  ApiQuery({ name: 'limit', required: false, example: 100 }),
];

@ApiTags('Telemetry')
@Controller('deployment/:deploymentId/telemetry')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'No autorizado' })
@ApiParam({ name: 'deploymentId', format: 'uuid' })
@ApiNotFoundResponse({ description: 'El despliegue no existe' })
export class TelemetryQueryController {
  constructor(private readonly query: QueryDeploymentTelemetryUseCase) {}

  @Get('traces')
  @applyDecorators(
    ApiOperation({
      summary: 'Spans recibidos del despliegue (más recientes primero)',
    }),
    ...filterDocs,
  )
  traces(
    @Param('deploymentId') deploymentId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.query.spans(deploymentId, parseFilters(query));
  }

  @Get('metrics')
  @applyDecorators(
    ApiOperation({ summary: 'Puntos de métricas del despliegue' }),
    ApiQuery({ name: 'name', required: false }),
    ...filterDocs,
  )
  metrics(
    @Param('deploymentId') deploymentId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.query.metrics(deploymentId, {
      ...parseFilters(query),
      name: query.name || undefined,
    });
  }

  @Get('logs')
  @applyDecorators(
    ApiOperation({ summary: 'Logs del despliegue' }),
    ApiQuery({ name: 'severity', required: false, example: 'ERROR' }),
    ...filterDocs,
  )
  logs(
    @Param('deploymentId') deploymentId: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.query.logs(deploymentId, {
      ...parseFilters(query),
      severity: query.severity || undefined,
    });
  }
}
