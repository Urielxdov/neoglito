import { useMemo } from 'react';
import type { ProjectDetailRepository } from '@neoglito/web/features/projects/components/list/project-detail-modal';
import type { ProjectDetailRepositoryInfo } from '@neoglito/web/features/projects/components/detail/project-detail-view';
import { useProjects } from '@neoglito/web/features/projects/hooks/use-projects';
import { useRepositories } from '@neoglito/web/features/repositories/use-repositories';
import { useProjectCountByRepositoryId, useSelectedRepositories } from '@neoglito/web/features/repositories/use-repository-selectors';
import type { Project } from '@neoglito/web/features/projects/project.model';
import { useProjectsState } from '@neoglito/web/features/projects/projects.context';
import {
  getProjectDeployRepositories,
  getProjectDetailRepositories,
  isProjectNameTaken,
} from '@neoglito/web/features/repositories/repository-selection.helpers';

export function useOpenProject(): Project | null {
  const { allProjects } = useProjects();
  const { openId } = useProjectsState();

  return allProjects.find((project) => project.id === openId) ?? null;
}

export function useActiveProject(): Project | null {
  const { allProjects } = useProjects();
  const { activeId } = useProjectsState();

  return allProjects.find((project) => project.id === activeId) ?? null;
}

export function useOpenProjectRepositories(): ProjectDetailRepository[] {
  const openProject = useOpenProject();
  const { allRepositories } = useRepositories();
  const projectCountByRepositoryId = useProjectCountByRepositoryId();

  return useMemo(
    () =>
      getProjectDetailRepositories(
        openProject,
        allRepositories,
        projectCountByRepositoryId,
      ),
    [openProject, allRepositories, projectCountByRepositoryId],
  );
}

export function useActiveProjectRepositories(): ProjectDetailRepositoryInfo[] {
  const activeProject = useActiveProject();
  const { allRepositories } = useRepositories();

  return useMemo(
    () => getProjectDeployRepositories(activeProject, allRepositories),
    [activeProject, allRepositories],
  );
}

export function useProjectCreationStatus() {
  const { allProjects } = useProjects();
  const { newName, newDescription, submitting } = useProjectsState();
  const selectedRepositories = useSelectedRepositories();

  const nameTaken = isProjectNameTaken(allProjects, newName);
  const canCreateProject =
    newName.trim().length > 0 &&
    newDescription.trim().length > 0 &&
    !nameTaken &&
    selectedRepositories.length > 0 &&
    !submitting;

  return { nameTaken, canCreateProject };
}
