import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { DeploymentTelemetryTokenPort } from '../../application/ports/deployment-telemetry-token.port.js';

export const hashTelemetryToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class PrismaDeploymentTelemetryTokenRepository implements DeploymentTelemetryTokenPort {
  constructor(private readonly prisma: PrismaService) {}

  async issue(deploymentId: string): Promise<string> {
    const token = `ngt_${randomBytes(32).toString('base64url')}`;
    const tokenHash = hashTelemetryToken(token);
    await this.prisma.deploymentTelemetryToken.upsert({
      where: { deploymentId },
      create: { deploymentId, tokenHash },
      update: { tokenHash, revokedAt: null, createdAt: new Date() },
    });
    return token;
  }

  async resolve(token: string): Promise<string | null> {
    const record = await this.prisma.deploymentTelemetryToken.findUnique({
      where: { tokenHash: hashTelemetryToken(token) },
      select: { deploymentId: true, revokedAt: true },
    });
    return record && !record.revokedAt ? record.deploymentId : null;
  }

  async revoke(deploymentId: string): Promise<void> {
    await this.prisma.deploymentTelemetryToken.updateMany({
      where: { deploymentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
