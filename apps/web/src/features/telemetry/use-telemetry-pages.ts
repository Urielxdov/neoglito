import { useInfiniteQuery } from '@tanstack/react-query';
import { telemetryService } from '@neoglito/web/features/telemetry/telemetry.service';
import { TELEMETRY_RANGES } from '@neoglito/web/features/telemetry/telemetry.reducer';
import type { TelemetrySignal } from '@neoglito/web/features/telemetry/telemetry.service';
import type { TelemetryRange } from '@neoglito/web/features/telemetry/telemetry.reducer';

const PAGE_SIZE = 500;
const LIVE_REFRESH_MS = 5_000;

export const telemetryQueryKey = (
  deploymentId: string,
  signal: TelemetrySignal,
  range: TelemetryRange,
) => ['telemetry', deploymentId, signal, range] as const;

interface UseTelemetryPagesOptions<S extends TelemetrySignal> {
  deploymentId: string;
  signal: S;
  range: TelemetryRange;
  live: boolean;
  enabled?: boolean;
}

/**
 * Páginas de una señal de telemetría paginada por cursor (`before`).
 * La ventana `from` se calcula al consultar y no forma parte de la clave:
 * así el refresco en vivo desplaza el rango sin crear una caché nueva.
 */
export function useTelemetryPages<S extends TelemetrySignal>({
  deploymentId,
  signal,
  range,
  live,
  enabled = true,
}: UseTelemetryPagesOptions<S>) {
  const rangeMs =
    TELEMETRY_RANGES.find((entry) => entry.key === range)?.ms ?? 0;

  const query = useInfiniteQuery({
    queryKey: telemetryQueryKey(deploymentId, signal, range),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const response = await telemetryService.list(deploymentId, signal, {
        from: new Date(Date.now() - rangeMs).toISOString(),
        before: pageParam ?? undefined,
        limit: PAGE_SIZE,
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.error?.message ?? 'No fue posible cargar la telemetría.',
        );
      }

      return response.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextBefore,
    enabled,
    refetchInterval: live ? LIVE_REFRESH_MS : false,
  });

  return {
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    // Referencia temporal de la última carga: evita llamar a Date.now() al renderizar.
    loadedAt: query.dataUpdatedAt,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error?.message ?? null,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => void query.fetchNextPage(),
    refetch: () => void query.refetch(),
  };
}
