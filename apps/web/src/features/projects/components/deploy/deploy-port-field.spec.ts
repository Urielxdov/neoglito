import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeployPortField } from './deploy-port-field';
import { usePortReservation } from '@neoglito/web/features/ports/use-port-reservation';

vi.mock('@neoglito/web/features/ports/use-port-reservation', () => ({
  usePortReservation: vi.fn(),
}));

function renderField(value = '3000', options = {}) {
  return renderToString(
    createElement(DeployPortField, {
      projectId: 7,
      port: {
        service: 'api',
        dockerComposePath: 'compose.yml',
        publishedPort: value,
        targetPort: '3000',
        hostIp: null,
        protocol: 'tcp',
        mappingType: 'one-to-one',
      },
      reservations: [],
      canCheckPorts: true,
      onChange: vi.fn(),
      ...options,
    }),
  );
}

describe('DeployPortField availability label', () => {
  beforeEach(() =>
    vi
      .mocked(usePortReservation)
      .mockReset()
      .mockReturnValue({ status: 'idle' }),
  );

  it('checks the initial value and avoids claiming it is available before the server responds', () => {
    const html = renderField();
    expect(usePortReservation).toHaveBeenCalledWith(7, '3000', false);
    expect(html).toContain('Comprobando disponibilidad');
    expect(html).not.toContain('Puerto disponible');
    expect(html).toContain('aria-busy="true"');
  });

  it('labels server-confirmed ports as available', () => {
    vi.mocked(usePortReservation).mockReturnValue({
      status: 'reserved',
      ownerKey: 'owner',
    });
    expect(renderField()).toContain('Puerto disponible · reservado');
  });

  it('labels initial conflicts as unavailable', () => {
    expect(
      renderField('3000', {
        reservations: [{ port: 3000, owner: 'otro proyecto' }],
      }),
    ).toContain('No disponible');
  });

  it('updates the check when the value changes and keeps the input editable during validation', () => {
    vi.mocked(usePortReservation).mockReturnValue({ status: 'pending' });
    const html = renderField('4000');
    expect(usePortReservation).toHaveBeenCalledWith(7, '4000', false);
    expect(html).toContain('Comprobando disponibilidad');
    expect(html).not.toContain('readOnly');
    expect(html).not.toContain('readonly');
  });

  it('shows the backend conflict or validation error instead of a free label', () => {
    vi.mocked(usePortReservation).mockReturnValue({
      status: 'failed',
      message: 'El puerto 3000 no está disponible',
    });
    expect(renderField()).toContain('El puerto 3000 no está disponible');
    vi.mocked(usePortReservation).mockReturnValue({ status: 'idle' });
    expect(renderField('70000')).toContain('puerto entre 1 y 65535');
  });

  it('distinguishes waiting for data from a confirmed result', () => {
    expect(renderField('3000', { canCheckPorts: false })).toContain(
      'Esperando la consulta de puertos',
    );
    expect(usePortReservation).toHaveBeenCalledWith(7, null, false);
  });

  it('shows a Docker conflict even if an old draft reservation succeeded', () => {
    const ownerKey = 'port-reservation:owner:draft:7:port:5432';
    vi.mocked(usePortReservation).mockReturnValue({
      status: 'reserved',
      ownerKey,
    });
    const html = renderField('5432', {
      reservations: [
        { port: 5432, owner: 'mi formulario', ownerKey },
        {
          port: 5432,
          owner: 'el contenedor neoglito-postgres-1',
          ownerKey: 'host-postgres',
        },
      ],
    });
    expect(html).toContain('No disponible');
    expect(html).not.toContain('Puerto disponible');
  });
});
