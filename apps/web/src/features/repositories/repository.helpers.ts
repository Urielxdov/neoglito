import type { Repository } from '@neoglito/web/features/repositories/repository.model';

export function getVisibleRepositories(
  repositories: Repository[],
  query: string,
): Repository[] {
  const normalizedQuery = query.trim().toLowerCase();

  return repositories.filter(
    (repository) =>
      repository.name.toLowerCase().includes(normalizedQuery) ||
      repository.description.toLowerCase().includes(normalizedQuery),
  );
}
