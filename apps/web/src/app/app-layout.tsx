import { useRef } from 'react';
import { Moon, Sun } from 'lucide';
import { Outlet, useLocation } from 'react-router-dom';
import { AppIcon } from '@neoglito/web/shared/components/app-icon';
import { useTheme } from '@neoglito/web/shared/hooks/use-theme';
import { NeoglitoLogo } from '@neoglito/web/shared/branding/neoglito-logo';
import { useNeoglitoSplash } from '@neoglito/web/shared/branding/use-neoglito-splash';

export function AppLayout() {
  const { isDark, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const pageTitle =
    pathname === '/authentication'
      ? 'Conectar cuenta'
      : pathname === '/repositories'
        ? 'Repositorios'
        : pathname.endsWith('/analysis')
          ? 'Análisis del proyecto'
          : pathname.startsWith('/projects/')
            ? 'Configuración del proyecto'
            : 'Proyectos';
  const logoRef = useRef<HTMLSpanElement>(null);
  const logoDocked = useNeoglitoSplash(logoRef, isDark);

  return (
    <div
      data-theme={isDark ? 'dark' : 'light'}
      className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-[#16202e] dark:bg-[#0c121d] dark:text-[#e8edf6]"
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e6eaf0] bg-white px-5 dark:border-[#253044] dark:bg-[#111826] sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <NeoglitoLogo
            ref={logoRef}
            className={`shrink-0 text-[24px] ${logoDocked ? '' : 'invisible'}`}
          />
          <span className="hidden text-sm text-[#8c98ac] dark:text-[#7a8699] sm:inline">
            /
          </span>
          <span className="truncate text-sm text-[#51607a] dark:text-[#a7b4c8]">
            {pageTitle}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#d6dce5] bg-white text-[#51607a] transition-colors hover:bg-[#f1f5f9] dark:border-[#2e3a51] dark:bg-[#111826] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]"
        >
          <AppIcon icon={isDark ? Sun : Moon} size={16} />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
