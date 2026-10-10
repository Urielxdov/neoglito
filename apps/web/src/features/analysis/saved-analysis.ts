import type { DeploymentResponse } from '@neoglito/web/shared/api/contracts';
import type { AnalyzeState } from './analysis.reducer';

export function createSavedAnalysisState({
  projectId,
  deployments,
}: {
  projectId: number;
  deployments: DeploymentResponse[];
}): AnalyzeState {
  return {
    projectId,
    source: 'saved',
    // The API returns deployments, not repository IDs. Keep every deployment
    // in its own group, including multiple deployments from the same Compose.
    repos: deployments
      .filter((deployment) => deployment.projectId === projectId)
      .map((deployment, index) => ({
        repositoryId: -(index + 1),
        label: `Despliegue ${deployment.id.slice(0, 8)} · ${deployment.status}`,
        status: 'succeeded',
        deployment,
        message: deployment.services.length
          ? null
          : 'Este despliegue no tiene servicios registrados.',
      })),
    collapsed: {},
    selectedKey: null,
    tab: 'services',
  };
}
