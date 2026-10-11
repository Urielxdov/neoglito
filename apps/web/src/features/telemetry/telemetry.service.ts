import type {
  ApiResponse,
  TelemetryLogResponse,
  TelemetryMetricPointResponse,
  TelemetryPageResponse,
  TelemetrySpanResponse,
} from '@neoglito/web/shared/api/contracts';
import { apiClient } from '@neoglito/web/shared/api/client';

export type TelemetrySignal = 'traces' | 'metrics' | 'logs';

export interface TelemetryPageRequest {
  from?: string;
  before?: string;
  limit?: number;
}

interface TelemetryItemBySignal {
  traces: TelemetrySpanResponse;
  metrics: TelemetryMetricPointResponse;
  logs: TelemetryLogResponse;
}

function listSignal<S extends TelemetrySignal>(
  deploymentId: string,
  signal: S,
  request: TelemetryPageRequest,
): Promise<ApiResponse<TelemetryPageResponse<TelemetryItemBySignal[S]>>> {
  const params = new URLSearchParams();
  if (request.from) params.set('from', request.from);
  if (request.before) params.set('before', request.before);
  if (request.limit !== undefined) params.set('limit', String(request.limit));
  const query = params.toString();

  return apiClient.get<TelemetryPageResponse<TelemetryItemBySignal[S]>>(
    `/deployment/${encodeURIComponent(deploymentId)}/telemetry/${signal}${
      query ? `?${query}` : ''
    }`,
  );
}

export const telemetryService = {
  list: listSignal,
};
