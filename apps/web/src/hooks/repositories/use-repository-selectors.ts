import { useMemo } from 'react';
import { useProjects } from '@neoglito/web/hooks/projects/use-projects';
import { useRepositories } from '@neoglito/web/hooks/repositories/use-repositories';
import type { Repository } from '@neoglito/web/models/repository';
import { useRepositoriesState } from '@neoglito/web/state/repositories/repositories.context';
import {
  getProjectCountByRepositoryId,
  getVisibleRepositories,
} from '@neoglito/web/utils/repositories/repository-selection.helpers';

export function useVisibleRepositories(): Repository[] {
  const { allRepositories } = useRepositories();
  const { query } = useRepositoriesState();

  return useMemo(
    () => getVisibleRepositories(allRepositories, query),
    [allRepositories, query],
  );
}

export function useSelectedRepositories(): Repository[] {
  const { allRepositories } = useRepositories();
  const { selectedIds } = useRepositoriesState();

  return useMemo(
    () => allRepositories.filter((repository) => selectedIds.has(repository.id)),
    [allRepositories, selectedIds],
  );
}

export function useAllVisibleRepositoriesSelected(): boolean {
  const visibleRepositories = useVisibleRepositories();
  const { selectedIds } = useRepositoriesState();

  return (
    visibleRepositories.length > 0 &&
    visibleRepositories.every((repository) => selectedIds.has(repository.id))
  );
}

export function useProjectCountByRepositoryId(): Map<number, number> {
  const { allProjects } = useProjects();

  return useMemo(
    () => getProjectCountByRepositoryId(allProjects),
    [allProjects],
  );
}
