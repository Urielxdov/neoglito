import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './app-routes';

const fixtures = vi.hoisted(() => ({
  status: 'authenticated',
  loading: false,
  error: null as string | null,
  project: {
    id: 7,
    name: 'Proyecto de prueba',
    description: 'Descripción de prueba',
    createdAt: new Date(),
    updatedAt: new Date(),
    repositories: [],
  },
  compose: vi.fn(),
}));

vi.mock('@neoglito/web/app/app-layout', () => ({
  AppLayout: () => createElement(Outlet),
}));
vi.mock('@neoglito/web/features/auth/use-auth', () => ({
  useAuth: () => ({ status: fixtures.status, user: null }),
}));
vi.mock('@neoglito/web/features/ports/use-ports', () => ({
  usePorts: () => ({}),
}));
vi.mock('@neoglito/web/features/projects/hooks/use-projects', () => ({
  useProjects: () => ({
    allProjects: [fixtures.project],
    isLoading: fixtures.loading,
    isError: !!fixtures.error,
    error: fixtures.error,
    refresh: vi.fn(),
  }),
}));
vi.mock('@neoglito/web/features/repositories/use-repositories', () => ({
  useRepositories: () => ({
    allRepositories: [],
    isLoading: false,
    isError: false,
    error: null,
  }),
}));
vi.mock('@neoglito/web/features/projects/hooks/use-project-compose', () => ({
  useProjectCompose: fixtures.compose,
}));

function renderRoute(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderToString(
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        MemoryRouter,
        { initialEntries: [path] },
        createElement(AppRoutes),
      ),
    ),
  );
}

describe('Workspace routes', () => {
  beforeEach(() => {
    fixtures.status = 'authenticated';
    fixtures.loading = false;
    fixtures.error = null;
    fixtures.compose
      .mockReset()
      .mockReturnValue({ isSuccess: true, isLoading: false, isError: false });
  });

  it('renders repository selection separately from the project list', () => {
    expect(renderRoute('/repositories')).not.toContain('Proyecto de prueba');
    expect(renderRoute('/projects')).toContain('Proyecto de prueba');
  });

  it.each(['deploy', 'routes', 'repos', 'general'])(
    'opens the %s tab from a direct project URL',
    (tab) => {
      const html = renderRoute(`/projects/7/${tab}`);
      expect(html).toContain('Proyecto de prueba');
      expect(html).not.toContain('Proyecto no encontrado');
      expect(fixtures.compose).toHaveBeenCalledWith(fixtures.project);
      if (tab === 'general') expect(html).toContain('Descripción de prueba');
      if (tab === 'routes') expect(html).toContain('OpenAPI');
    },
  );

  it.each(['/projects/999/deploy', '/projects/invalid/deploy'])(
    'handles missing or invalid project IDs at %s',
    (path) => {
      expect(renderRoute(path)).toContain('Proyecto no encontrado');
      expect(fixtures.compose).not.toHaveBeenCalled();
    },
  );

  it('shows loading and API errors instead of reporting a missing project', () => {
    fixtures.loading = true;
    expect(renderRoute('/projects/7/deploy')).toContain('Cargando proyecto');
    fixtures.loading = false;
    fixtures.error = 'No fue posible cargar los proyectos';
    expect(renderRoute('/projects/7/deploy')).toContain(fixtures.error);
    expect(fixtures.compose).not.toHaveBeenCalled();
  });

  it('opens analysis after a reload without automatically starting a deployment', () => {
    const html = renderRoute('/projects/7/analysis');
    expect(html).toContain('Recuperando análisis guardado');
    expect(html).toContain('href="/projects/7/deploy"');
    expect(fixtures.compose).not.toHaveBeenCalled();
  });

  it('links from Deploy to the saved analysis even without ready repositories', () => {
    const html = renderRoute('/projects/7/deploy');
    expect(html).toContain('Ver análisis existente');
    expect(html).toContain('href="/projects/7/analysis?view=saved"');
  });

  it('protects deep project URLs when authentication is missing', () => {
    fixtures.status = 'unauthenticated';
    expect(renderRoute('/projects/7/general')).not.toContain(
      'Proyecto de prueba',
    );
    expect(fixtures.compose).not.toHaveBeenCalled();
  });
});
