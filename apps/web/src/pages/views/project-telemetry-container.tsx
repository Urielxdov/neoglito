import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { deploymentService } from '@neoglito/web/features/projects/deployment.service';
import { useRouteProject } from '@neoglito/web/features/projects/hooks/use-route-project';
import { TelemetryProvider } from '@neoglito/web/features/telemetry/telemetry.context';
import { TelemetryView } from '@neoglito/web/features/telemetry/components/telemetry-view';

export function ProjectTelemetryContainer() {
  const project = useRouteProject();
  const { deploymentId } = useParams();
  const deployments = useQuery({
    queryKey: ['saved-project-analysis', project.id],
    queryFn: () => deploymentService.getSavedAnalysis(project.id),
    retry: false,
  });
  const deployment = deployments.data?.find(
    (candidate) => candidate.id === deploymentId,
  );

  if (deployments.isPending) {
    return <p role="status">Recuperando despliegue...</p>;
  }
  if (deployments.isError) {
    return (
      <div role="alert" className="flex flex-col gap-2">
        <p>{deployments.error.message}</p>
        <button type="button" onClick={() => void deployments.refetch()}>
          Reintentar
        </button>
      </div>
    );
  }
  if (!deployment) {
    return (
      <div className="flex flex-col gap-2">
        <p>Despliegue no encontrado en este proyecto.</p>
        <Link
          to={`/projects/${project.id}/analysis?view=saved`}
          className="text-[#2257c4] dark:text-[#5b8df5]"
        >
          Volver al análisis
        </Link>
      </div>
    );
  }

  return (
    // La clave reinicia filtros y selección al cambiar de despliegue.
    <TelemetryProvider key={deployment.id}>
      <TelemetryView project={project} deployment={deployment} />
    </TelemetryProvider>
  );
}
