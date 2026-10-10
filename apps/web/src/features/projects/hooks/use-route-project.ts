import { useOutletContext } from 'react-router-dom';
import type { Project } from '@neoglito/web/features/projects/project.model';

export function useRouteProject() {
  return useOutletContext<Project>();
}
