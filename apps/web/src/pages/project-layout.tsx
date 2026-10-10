import { useEffect } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { useProjects } from '@neoglito/web/features/projects/hooks/use-projects';
import { useRepositories } from '@neoglito/web/features/repositories/use-repositories';
import { useProjectsDispatch } from '@neoglito/web/features/projects/projects.context';
import { useDeploysDispatch } from '@neoglito/web/features/deploys/deploys.context';

export default function ProjectLayout() {
  const { projectId } = useParams();
  const projectsDispatch = useProjectsDispatch();
  const deploysDispatch = useDeploysDispatch();
  useEffect(() => {
    projectsDispatch({ type: 'edit-reset' });
    deploysDispatch({ type: 'deploy-row-closed' });
  }, [projectId, projectsDispatch, deploysDispatch]);
  const projects = useProjects();
  const repositories = useRepositories();
  const id = Number(projectId);
  const project = projects.allProjects.find((candidate) => candidate.id === id);
  const validId =
    /^\d+$/.test(projectId ?? '') && Number.isSafeInteger(id) && id > 0;

  if (validId && (projects.isLoading || repositories.isLoading)) {
    return <p role="status">Cargando proyecto...</p>;
  }
  if (projects.isError || repositories.isError) {
    return (
      <div role="alert">
        <p>{projects.error ?? repositories.error}</p>
        <Link to="/projects">Volver a proyectos</Link>
      </div>
    );
  }
  if (!validId || !project) {
    return (
      <div>
        <p>Proyecto no encontrado.</p>
        <Link to="/projects">Volver a proyectos</Link>
      </div>
    );
  }
  return <Outlet context={project} />;
}
