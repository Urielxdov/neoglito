import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeployPortField } from '../apps/web/src/features/projects/components/deploy/deploy-port-field.js';
import { usePortReservation } from '../apps/web/src/features/ports/use-port-reservation.js';

vi.mock('../apps/web/src/features/ports/use-port-reservation.js', () => ({
  usePortReservation: vi.fn(() => ({ status: 'idle' })),
}));
vi.mock('../apps/web/src/shared/components/app-icon.js', () => ({
  AppIcon: () => null,
}));

const props = {
  projectId: 1,
  port: {
    service: 'api',
    dockerComposePath: '/repo/compose.yml',
    publishedPort: '3000',
    targetPort: '3000',
    hostIp: null,
    protocol: 'tcp' as const,
    mappingType: 'one-to-one' as const,
  },
  reservations: [],
  canCheckPorts: true,
  onChange: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

it('shows the assigned value disabled and never attempts to reserve it', () => {
  const html = renderToStaticMarkup(
    createElement(DeployPortField, { ...props, assignedPort: '3002' }),
  );
  expect(html).toMatch(/<input[^>]*disabled=""/);
  expect(html).toContain('value="3002"');
  expect(html).toContain('Puerto asignado al contenedor');
  expect(usePortReservation).toHaveBeenCalledWith(1, null, false);
});

it('keeps unassigned fields editable with their existing reservation flow', () => {
  const html = renderToStaticMarkup(createElement(DeployPortField, props));
  expect(html).not.toMatch(/<input[^>]*disabled=/);
  expect(html).toContain('value="3000"');
  expect(usePortReservation).toHaveBeenCalledWith(1, '3000', false);
});

it('blocks reservations while the deployment query is loading or failed', () => {
  const html = renderToStaticMarkup(
    createElement(DeployPortField, { ...props, disabled: true }),
  );
  expect(html).toMatch(/<input[^>]*disabled=""/);
  expect(usePortReservation).toHaveBeenCalledWith(1, null, false);
});
