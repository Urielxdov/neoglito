import { createReducerContext } from '@neoglito/web/shared/state/create-reducer-context';
import {
  initialProjectsState,
  projectsReducer,
} from '@neoglito/web/features/projects/projects.reducer';
import type {
  ProjectsAction,
  ProjectsState,
} from '@neoglito/web/features/projects/projects.reducer';

const context = createReducerContext<ProjectsState, ProjectsAction>(
  'Projects',
  projectsReducer,
  initialProjectsState,
);

export const ProjectsProvider = context.Provider;
export const useProjectsState = context.useState;
export const useProjectsDispatch = context.useDispatch;
