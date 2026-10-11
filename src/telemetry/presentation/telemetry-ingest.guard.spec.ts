import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { DeploymentTelemetryTokenPort } from '../application/ports/deployment-telemetry-token.port.js';
import {
  TelemetryIngestGuard,
  type TelemetryIngestRequest,
} from './telemetry-ingest.guard.js';

const tokens = {
  resolve: vi.fn<DeploymentTelemetryTokenPort['resolve']>(),
};
const guard = new TelemetryIngestGuard(
  tokens as unknown as DeploymentTelemetryTokenPort,
);

function run(authorization?: string) {
  const request = {
    headers: { authorization },
  } as unknown as TelemetryIngestRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, result: guard.canActivate(context) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('TELEMETRY_SYSTEM_TOKEN', 'system-secret');
  tokens.resolve.mockResolvedValue(null);
});
afterEach(() => vi.unstubAllEnvs());

describe('TelemetryIngestGuard', () => {
  it('rechaza peticiones sin Authorization o con otro esquema', async () => {
    await expect(run().result).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(run('Basic abc').result).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(tokens.resolve).not.toHaveBeenCalled();
  });

  it('acepta el token de sistema sin consultar la base de datos', async () => {
    const { request, result } = run('Bearer system-secret');
    await expect(result).resolves.toBe(true);
    expect(request.telemetryDeploymentId).toBeNull();
    expect(tokens.resolve).not.toHaveBeenCalled();
  });

  it('asocia un token de deployment vigente a su deployment', async () => {
    tokens.resolve.mockResolvedValue('dep-1');
    const { request, result } = run('Bearer ngt_abc');
    await expect(result).resolves.toBe(true);
    expect(request.telemetryDeploymentId).toBe('dep-1');
    expect(tokens.resolve).toHaveBeenCalledExactlyOnceWith('ngt_abc');
  });

  it('acepta el espacio codificado como %20 que emiten algunos SDK', async () => {
    tokens.resolve.mockResolvedValue('dep-1');
    const { result } = run('Bearer%20ngt_abc');
    await expect(result).resolves.toBe(true);
    expect(tokens.resolve).toHaveBeenCalledExactlyOnceWith('ngt_abc');
  });

  it('rechaza tokens desconocidos o revocados', async () => {
    await expect(run('Bearer ngt_nope').result).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('sin TELEMETRY_SYSTEM_TOKEN el token de sistema no existe', async () => {
    vi.stubEnv('TELEMETRY_SYSTEM_TOKEN', '');
    await expect(run('Bearer system-secret').result).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
