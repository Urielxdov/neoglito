import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { ProjectDetailRepositoryInfo } from '@neoglito/web/features/projects/components/detail/project-detail-view';
import { useProjects } from '@neoglito/web/features/projects/hooks/use-projects';
import { useRepositories } from '@neoglito/web/features/repositories/use-repositories';
import { useSelectedRepositories } from '@neoglito/web/features/repositories/use-repository-selectors';
import type { Project } from '@neoglito/web/features/projects/project.model';
import { useProjectsState } from '@neoglito/web/features/projects/projects.context';
import {
  getProjectDeployRepositories,
  isProjectNameTaken,
} from '@neoglito/web/features/repositories/repository-selection.helpers';

export function useActiveProject(): Project | null {
  const { allProjects } = useProjects();
  const { projectId } = useParams();
  const activeId = Number(projectId);

  return allProjects.find((project) => project.id === activeId) ?? null;
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
