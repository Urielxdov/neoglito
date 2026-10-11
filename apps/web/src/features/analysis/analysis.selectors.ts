import type { AnalyzeState } from './analysis.reducer';

export function selectAnalysisServiceKey(analyze: AnalyzeState) {
  if (analyze.selectedKey !== null) return analyze.selectedKey;
  const firstSucceeded = analyze.repos.find(
    (repo) =>
      repo.status === 'succeeded' &&
      (repo.deployment?.services.length ?? 0) > 0,
  );
  return firstSucceeded ? `${firstSucceeded.repositoryId}:0` : null;
}
