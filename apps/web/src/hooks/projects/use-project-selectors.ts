import { useMemo } from 'react';
import type { ProjectDetailRepository } from '@neoglito/web/components/repositories/project-detail-modal';
import type { ProjectDetailRepositoryInfo } from '@neoglito/web/components/repositories/project-detail-view';
import { useProjects } from '@neoglito/web/hooks/projects/use-projects';
import { useRepositories } from '@neoglito/web/hooks/repositories/use-repositories';
import { useProjectCountByRepositoryId, useSelectedRepositories } from '@neoglito/web/hooks/repositories/use-repository-selectors';
import type { Project } from '@neoglito/web/models/project';
import { useProjectsState } from '@neoglito/web/state/projects/projects.context';
import {
  getProjectDeployRepositories,
  getProjectDetailRepositories,
  isProjectNameTaken,
} from '@neoglito/web/utils/repositories/repository-selection.helpers';

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
