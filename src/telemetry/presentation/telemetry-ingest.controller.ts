import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnsupportedMediaTypeException,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { IngestTelemetryUseCase } from '../application/use-cases/ingest-telemetry.use-case.js';
import {
  TelemetryIngestGuard,
  type TelemetryIngestRequest,
} from './telemetry-ingest.guard.js';

/**
 * Receptor OTLP/HTTP (JSON) al que el collector reenvía. Responde `{}` directo
 * con `@Res()` para no pasar por el envelope de ApiResponseInterceptor: los
 * exporters OTLP esperan la respuesta del protocolo, no `{ success, data }`.
 */
@ApiExcludeController()
@Controller('telemetry/ingest/v1')
@UseGuards(TelemetryIngestGuard)
export class TelemetryIngestController {
  constructor(private readonly ingest: IngestTelemetryUseCase) {}

  @Post('traces')
  @HttpCode(200)
  async traces(
    @Req() request: TelemetryIngestRequest,
    @Body() body: unknown,
    @Res() response: Response,
  ): Promise<void> {
    this.requireJson(request);
    await this.ingest.traces(body, request.telemetryDeploymentId ?? null);
    response.status(200).json({});
  }

  @Post('metrics')
  @HttpCode(200)
  async metrics(
    @Req() request: TelemetryIngestRequest,
    @Body() body: unknown,
    @Res() response: Response,
  ): Promise<void> {
    this.requireJson(request);
    await this.ingest.metrics(body, request.telemetryDeploymentId ?? null);
    response.status(200).json({});
  }

  @Post('logs')
  @HttpCode(200)
  async logs(
    @Req() request: TelemetryIngestRequest,
    @Body() body: unknown,
    @Res() response: Response,
  ): Promise<void> {
    this.requireJson(request);
    await this.ingest.logs(body, request.telemetryDeploymentId ?? null);
    response.status(200).json({});
  }

  private requireJson(request: TelemetryIngestRequest): void {
    if (!request.is('application/json'))
      throw new UnsupportedMediaTypeException(
        'El receptor solo acepta OTLP/HTTP con application/json',
      );
  }
}
