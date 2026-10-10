import { NavLink, Outlet } from 'react-router-dom';
import { AnalysisProvider } from '@neoglito/web/features/analysis/analysis.context';
import { DeploysProvider } from '@neoglito/web/features/deploys/deploys.context';
import { ProjectsProvider } from '@neoglito/web/features/projects/projects.context';
import { RepositoriesProvider } from '@neoglito/web/features/repositories/repositories.context';
import { usePorts } from '@neoglito/web/features/ports/use-ports';

function WorkspaceContent() {
  usePorts();
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-[22px] px-6 py-6">
      <nav aria-label="Navegación principal" className="flex gap-3">
        {[
          { to: '/repositories', label: 'Repositorios' },
          { to: '/projects', label: 'Proyectos' },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `rounded-lg px-4 py-2 text-sm font-semibold ${
                isActive
                  ? 'bg-[#2257c4] text-white'
                  : 'bg-white text-[#51607a] dark:bg-[#111826] dark:text-[#a7b4c8]'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </main>
  );
}

export function WorkspaceLayout() {
  return (
    <RepositoriesProvider>
      <ProjectsProvider>
        <DeploysProvider>
          <AnalysisProvider>
            <WorkspaceContent />
          </AnalysisProvider>
        </DeploysProvider>
      </ProjectsProvider>
    </RepositoriesProvider>
  );
}
