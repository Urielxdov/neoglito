import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { TelemetryRepositoryPort } from '../ports/telemetry-repository.port.js';
import { IngestTelemetryUseCase } from './ingest-telemetry.use-case.js';
import { PurgeExpiredTelemetryUseCase } from './purge-expired-telemetry.use-case.js';
import { QueryDeploymentTelemetryUseCase } from './query-deployment-telemetry.use-case.js';

const repository = {
  saveSpans: vi.fn(async () => undefined),
  saveMetricPoints: vi.fn(async () => undefined),
  saveLogs: vi.fn(async () => undefined),
  listSpans: vi.fn(),
  listMetricPoints: vi.fn(),
  listLogs: vi.fn(),
  deleteOlderThan: vi.fn(),
};
const asRepository = () => repository as unknown as TelemetryRepositoryPort;

beforeEach(() => vi.clearAllMocks());

describe('IngestTelemetryUseCase', () => {
  const ingest = new IngestTelemetryUseCase(asRepository());

  it('persiste los registros mapeados con el deployment del token', async () => {
    const count = await ingest.logs(
      {
        resourceLogs: [
          {
            scopeLogs: [
              {
                logRecords: [
                  {
                    timeUnixNano: '1700000000000000000',
                    body: { stringValue: 'a' },
                  },
                ],
              },
            ],
          },
        ],
      },
      'dep-1',
    );
    expect(count).toBe(1);
    expect(repository.saveLogs).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ deploymentId: 'dep-1', body: 'a' }),
    ]);
  });

  it('no toca la base de datos si el lote no trae registros válidos', async () => {
    expect(await ingest.traces({ resourceSpans: [] }, null)).toBe(0);
    expect(await ingest.metrics({}, null)).toBe(0);
    expect(repository.saveSpans).not.toHaveBeenCalled();
    expect(repository.saveMetricPoints).not.toHaveBeenCalled();
  });
});

describe('PurgeExpiredTelemetryUseCase', () => {
  const purge = new PurgeExpiredTelemetryUseCase(asRepository());

  it('borra en lotes hasta agotar lo vencido y respeta el corte de retención', async () => {
    repository.deleteOlderThan
      .mockResolvedValueOnce(5000)
      .mockResolvedValueOnce(120)
      .mockResolvedValueOnce(0);
    const now = new Date('2026-10-11T00:00:00.000Z');
    expect(await purge.execute(7, now)).toBe(5120);
    expect(repository.deleteOlderThan).toHaveBeenCalledTimes(3);
    expect(repository.deleteOlderThan.mock.calls[0]).toEqual([
      new Date('2026-10-04T00:00:00.000Z'),
      5000,
    ]);
  });
});

describe('QueryDeploymentTelemetryUseCase', () => {
  const prisma = { deployment: { findUnique: vi.fn() } };
  const query = new QueryDeploymentTelemetryUseCase(
    prisma as unknown as PrismaService,
    asRepository(),
  );
  const log = (iso: string) => ({ time: new Date(iso) });

  it('responde 404 si el deployment no existe', async () => {
    prisma.deployment.findUnique.mockResolvedValue(null);
    await expect(query.logs('x', {})).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.listLogs).not.toHaveBeenCalled();
  });

  it('pagina por cursor de tiempo pidiendo un registro extra', async () => {
    prisma.deployment.findUnique.mockResolvedValue({ id: 'dep-1' });
    repository.listLogs.mockResolvedValue([
      log('2026-01-03T00:00:00.000Z'),
      log('2026-01-02T00:00:00.000Z'),
      log('2026-01-01T00:00:00.000Z'),
    ]);
    const page = await query.logs('dep-1', { limit: 2, severity: 'error' });
    expect(repository.listLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        deploymentId: 'dep-1',
        limit: 3,
        severity: 'ERROR',
      }),
    );
    expect(page.items).toHaveLength(2);
    expect(page.nextBefore).toBe('2026-01-02T00:00:00.000Z');
  });

  it('acota el límite y no devuelve cursor en la última página', async () => {
    prisma.deployment.findUnique.mockResolvedValue({ id: 'dep-1' });
    repository.listLogs.mockResolvedValue([log('2026-01-01T00:00:00.000Z')]);
    const page = await query.logs('dep-1', { limit: 100000 });
    expect(repository.listLogs).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 501 }),
    );
    expect(page.nextBefore).toBeNull();
  });
});
