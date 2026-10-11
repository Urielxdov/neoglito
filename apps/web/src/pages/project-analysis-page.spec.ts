import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeploymentResponse } from '@neoglito/web/shared/api/contracts';
import type { AnalysisState } from '@neoglito/web/features/analysis/analysis.reducer';
import { analysisReducer } from '@neoglito/web/features/analysis/analysis.reducer';
import ProjectAnalysisPage from './project-analysis-page';

const fixtures = vi.hoisted(() => ({ analysis: null as AnalysisState }));
vi.mock('@neoglito/web/features/analysis/analysis.context', () => ({
  useAnalysisState: () => fixtures.analysis,
  useAnalysisDispatch: () => vi.fn(),
}));
vi.mock('@neoglito/web/features/projects/hooks/use-route-project', () => ({
  useRouteProject: () => ({ id: 7, name: 'Proyecto recuperado' }),
}));
vi.mock('@neoglito/web/features/projects/hooks/use-project-selectors', () => ({
  useActiveProjectRepositories: () => [],
}));

const deployment: DeploymentResponse = {
  id: 'saved-1234',
  projectId: 7,
  composePath: '/generated/compose.yml',
  status: 'running',
  createdAt: '2026-10-10T00:00:00Z',
  startedAt: '2026-10-10T00:00:00Z',
  finishedAt: null,
  services: [
    {
      id: 'container-1',
      deploymentId: 'saved-1234',
      composeServiceName: 'postgres',
      port: 5433,
      status: 'running',
      health: 'healthy',
      serviceType: 'DATABASE',
      lastObservedAt: '2026-10-10T00:00:00Z',
    },
  ],
};

function renderPage({
  data,
  error,
  path = '/projects/7/analysis',
}: { data?: DeploymentResponse[]; error?: Error; path?: string } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false } },
  });
  const queryKey = ['saved-project-analysis', 7];
  if (data) client.setQueryData(queryKey, data);
  if (error) {
    client.getQueryCache().build(client, { queryKey }).setState({
      status: 'error',
      error,
    });
  }
  return renderToString(
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        MemoryRouter,
        { initialEntries: [path] },
        createElement(ProjectAnalysisPage),
      ),
    ),
  );
}

describe('Recovering project analysis after a reload', () => {
  beforeEach(() => {
    fixtures.analysis = null;
  });

  it('shows saved services and classification without needing repository or Compose discovery', () => {
    const html = renderPage({ data: [deployment] });
    expect(html).toContain('postgres');
    expect(html).toContain('running');
    expect(html).toContain('/generated/compose.yml');
    expect(html).toContain('Despliegue saved-12');
    expect(html).toContain('Guardado');
    expect(html).toContain('última observación');
    expect(html).not.toContain('Selecciona un servicio');
  });

  it('keeps separate groups for multiple persisted deployments of one Compose', () => {
    const html = renderPage({
      data: [deployment, { ...deployment, id: 'older-5678' }],
    });
    expect(html).toContain('Despliegue saved-12');
    expect(html).toContain('Despliegue older-56');
  });

  it('uses the reducer selection for the detail panel and both service lists', () => {
    fixtures.analysis = {
      projectId: 7,
      repos: [
        {
          repositoryId: 1,
          label: 'Repositorio',
          status: 'succeeded',
          message: null,
          deployment: {
            ...deployment,
            services: [
              deployment.services[0],
              {
                ...deployment.services[0],
                id: 'container-2',
                composeServiceName: 'api',
                serviceType: 'BACKEND',
              },
            ],
          },
        },
      ],
      collapsed: {},
      selectedKey: null,
      tab: 'services',
    };
    // The first service is selected until the user makes an explicit selection.
    const detailHeader = (html: string) =>
      html.split('<section')[1].split('grid grid-cols-')[0];
    expect(detailHeader(renderPage())).toContain(
      'Tipo de servicio: Base de datos',
    );
    fixtures.analysis = analysisReducer(fixtures.analysis, {
      type: 'analyze-service-selected',
      key: '1:1',
    });
    const html = renderPage();
    expect(detailHeader(html)).toContain('Tipo de servicio: Backend');
    expect(detailHeader(html)).not.toContain('Tipo de servicio: Base de datos');
    fixtures.analysis = analysisReducer(fixtures.analysis, {
      type: 'analyze-tab-changed',
      tab: 'relations',
    });
    const relations = renderPage();
    expect(relations).toContain('Consulta a');
    expect(relations).not.toContain('Selecciona un contenedor');
  });

  it('reads collapsed groups from the same reducer state as the view', () => {
    fixtures.analysis = {
      projectId: 7,
      repos: [
        { repositoryId: 1, status: 'pending', deployment: null, message: null },
      ],
      collapsed: {},
      selectedKey: null,
      tab: 'services',
    };
    expect(renderPage()).toContain('Desplegando e identificando servicios');
    fixtures.analysis = analysisReducer(fixtures.analysis, {
      type: 'analyze-group-toggled',
      repositoryId: 1,
    });
    expect(renderPage()).not.toContain('Desplegando e identificando servicios');
  });

  it('shows recovery in progress with a link back to Deploy', () => {
    const html = renderPage();
    expect(html).toContain('Recuperando análisis guardado');
    expect(html).toContain('href="/projects/7/deploy"');
  });

  it('shows the empty result without asking to redeploy an existing project', () => {
    expect(renderPage({ data: [] })).toContain(
      'No hay despliegues registrados',
    );
  });

  it('offers retry when the API is unavailable', () => {
    const html = renderPage({ error: new Error('API no disponible') });
    expect(html).toContain('API no disponible');
    expect(html).toContain('Reintentar');
    expect(html).not.toContain('No hay despliegues registrados');
  });

  it('opens saved results even when a session deployment remained pending', () => {
    fixtures.analysis = {
      projectId: 7,
      repos: [
        { repositoryId: 1, status: 'pending', deployment: null, message: null },
      ],
      collapsed: {},
      selectedKey: null,
      tab: 'services',
    };
    expect(
      renderPage({
        data: [deployment],
        path: '/projects/7/analysis?view=saved',
      }),
    ).toContain('Guardado');
    expect(renderPage({ data: [deployment] })).toContain('Desplegando');
    expect(renderPage({ data: [deployment] })).not.toContain('Guardado');
  });
});
