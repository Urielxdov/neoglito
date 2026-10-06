import { useCallback } from 'react';
import { useActiveProject } from '@neoglito/web/features/projects/hooks/use-project-selectors';
import { useProjects } from '@neoglito/web/features/projects/hooks/use-projects';
import { projectService } from '@neoglito/web/features/projects/project.service';
import {
  useProjectsDispatch,
  useProjectsState,
} from '@neoglito/web/features/projects/projects.context';
import { isProjectNameTaken } from '@neoglito/web/features/repositories/repository-selection.helpers';

export function useProjectEditing() {
  const { allProjects, refresh: loadProjects } = useProjects();
  const activeProject = useActiveProject();
  const projectsState = useProjectsState();
  const projectsDispatch = useProjectsDispatch();

  const editName = projectsState.editName ?? activeProject?.name ?? '';
  const editDescription =
    projectsState.editDescription ?? activeProject?.description ?? '';
  const editNameTaken = isProjectNameTaken(
    allProjects,
    editName,
    activeProject?.id,
  );
  const editClean = activeProject
    ? editName === activeProject.name &&
      editDescription === activeProject.description
    : true;

  const handleSaveGeneral = useCallback(async () => {
    if (
      !activeProject ||
      editClean ||
      editNameTaken ||
      !editName.trim() ||
      !editDescription.trim()
    ) {
      return;
    }

    projectsDispatch({ type: 'edit-submitting' });

    const response = await projectService.update(activeProject.id, {
      name: editName.trim(),
      description: editDescription.trim(),
    });

    if (!response.success || !response.data) {
      projectsDispatch({
        type: 'edit-failed',
        message:
          response.error?.message ?? 'No fue posible guardar los cambios.',
      });
      return;
    }

    projectsDispatch({ type: 'edit-succeeded' });
    await loadProjects();
  }, [
    activeProject,
    editClean,
    editDescription,
    editName,
    editNameTaken,
    loadProjects,
    projectsDispatch,
  ]);

  return {
    editName,
    editDescription,
    editNameTaken,
    editClean,
    handleSaveGeneral,
  };
}
