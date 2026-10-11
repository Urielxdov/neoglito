import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { telemetrySystemToken } from '../application/telemetry-config.js';
import { DEPLOYMENT_TELEMETRY_TOKEN_PORT } from '../application/ports/deployment-telemetry-token.port.js';
import type { DeploymentTelemetryTokenPort } from '../application/ports/deployment-telemetry-token.port.js';

export interface TelemetryIngestRequest extends Request {
  /** null = emisor de sistema (la propia API). */
  telemetryDeploymentId?: string | null;
}

const digest = (value: string) => createHash('sha256').update(value).digest();

@Injectable()
export class TelemetryIngestGuard implements CanActivate {
  constructor(
    @Inject(DEPLOYMENT_TELEMETRY_TOKEN_PORT)
    private readonly tokens: DeploymentTelemetryTokenPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TelemetryIngestRequest>();
    // OTEL_EXPORTER_OTLP_HEADERS codifica el espacio como %20 en algunos SDK.
    const match = /^Bearer(?:\s|%20)+(\S+)$/i.exec(
      request.headers.authorization ?? '',
    );
    if (!match)
      throw new UnauthorizedException('Token de telemetría requerido');
    const token = match[1];

    const systemToken = telemetrySystemToken();
    // Se comparan digests para que la comparación sea de longitud constante.
    if (systemToken && timingSafeEqual(digest(token), digest(systemToken))) {
      request.telemetryDeploymentId = null;
      return true;
    }

    const deploymentId = await this.tokens.resolve(token);
    if (!deploymentId)
      throw new UnauthorizedException('Token de telemetría inválido');
    request.telemetryDeploymentId = deploymentId;
    return true;
  }
}
