import {
  useProjectAnalysisState,
  useProjectAnalysisDispatch,
} from '@neoglito/web/features/analysis/project-analysis.context';
import { selectAnalysisServiceKey } from '@neoglito/web/features/analysis/analysis.selectors';
import { shortName } from '@neoglito/web/features/repositories/repository-name';
import { ChevronRight } from 'lucide';
import { AppIcon } from '@neoglito/web/shared/components/app-icon';
import { serviceTone } from '@neoglito/web/features/projects/components/analyze/analyze-service-tone';
import { AnalyzeServiceTypeBadge } from '@neoglito/web/features/projects/components/analyze/analyze-service-type-badge';

export function AnalyzeRepoGroup({
  repositoryId,
  isFirst,
}: {
  repositoryId: number;
  isFirst: boolean;
}) {
  const { analyze, repositories } = useProjectAnalysisState();
  const dispatch = useProjectAnalysisDispatch();
  const repo = analyze.repos.find((repo) => repo.repositoryId === repositoryId);
  const repository = repositories.find(
    (repository) => repository.id === repositoryId,
  );
  const selectedKey = selectAnalysisServiceKey(analyze);
  if (!repo) return null;
  const repositoryName =
    repo.label ??
    (repository ? shortName(repository.name) : `#${repositoryId}`);
  const { status, message } = repo;
  const collapsed = Boolean(analyze.collapsed[repositoryId]);
  const services = repo.deployment?.services ?? [];
  const onToggleCollapse = () =>
    dispatch({ type: 'analyze-group-toggled', repositoryId });
  const onSelectService = (key: string) =>
    dispatch({ type: 'analyze-service-selected', key });
  const readyCount = services.filter(
    (service) => serviceTone(service.status, service.health).tone === 'ok',
  ).length;

  return (
    <div
      className={
        isFirst ? '' : 'border-t border-[#e6eaf0] dark:border-[#253044]'
      }
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#0c121d]"
      >
        <AppIcon
          icon={ChevronRight}
          size={13}
          className={`shrink-0 text-[#8c98ac] transition-transform dark:text-[#7a8699] ${collapsed ? '' : 'rotate-90'}`}
        />
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium text-[#16202e] dark:text-[#e8edf6]">
          {repositoryName}
        </span>
        <span className="shrink-0 text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
          {status === 'pending'
            ? 'Analizando…'
            : status === 'failed'
              ? 'Error'
              : `${readyCount}/${services.length}`}
        </span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-0.5 px-2.5 pb-2.5">
          {status === 'pending' && (
            <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 pl-[30px] text-[13px] text-[#8c98ac] dark:text-[#7a8699]">
              <span
                aria-hidden="true"
                className="block h-[9px] w-[9px] shrink-0 animate-pulse rounded-full bg-[#c8d0dc] dark:bg-[#3b4860]"
              />
              Desplegando e identificando servicios…
            </div>
          )}

          {status === 'failed' && (
            <div className="flex items-start gap-2.5 rounded-lg px-3 py-2 pl-[30px] text-[13px] text-[#a4550a] dark:text-[#f0a458]">
              <span
                aria-hidden="true"
                className="mt-1.5 block h-[9px] w-[9px] shrink-0 rounded-full bg-[#a4550a] dark:bg-[#f0a458]"
              />
              {message ?? 'No fue posible desplegar este repositorio.'}
            </div>
          )}

          {status === 'succeeded' &&
            services.map((service, serviceIndex) => {
              const key = `${repositoryId}:${serviceIndex}`;
              const tone = serviceTone(service.status, service.health);
              const selected = selectedKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectService(key)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 pl-[30px] text-left transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#0c121d] ${
                    selected ? 'bg-[#eef3fc] dark:bg-[#18243a]' : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`block h-[8px] w-[8px] shrink-0 rounded-full ${tone.dotClassName}`}
                  />
                  <span
                    className={`flex min-w-0 flex-1 flex-col items-start gap-1 text-[13px] ${selected ? 'font-semibold' : 'font-medium'} text-[#16202e] dark:text-[#e8edf6]`}
                  >
                    <span className="max-w-full truncate">
                      {service.composeServiceName}
                    </span>
                    <AnalyzeServiceTypeBadge type={service.serviceType} />
                  </span>
                  <span className="shrink-0 font-mono text-[11.5px] text-[#8c98ac] dark:text-[#7a8699]">
                    {tone.label}
                  </span>
                </button>
              );
            })}

          {status === 'succeeded' && message && (
            <p
              role="status"
              className="px-3 pt-1 text-[12px] leading-5 text-[#a4550a] dark:text-[#f0a458]"
            >
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
