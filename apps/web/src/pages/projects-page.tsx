import { Link } from 'react-router-dom';
import { ProjectsPanelContainer } from '@neoglito/web/pages/views/projects-panel-container';

export default function ProjectsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col gap-4">
      <Link
        to="/repositories"
        className="self-start text-sm font-semibold text-[#2257c4] dark:text-[#5b8df5]"
      >
        Seleccionar repositorios para un nuevo proyecto
      </Link>
      <ProjectsPanelContainer />
    </div>
  );
}
