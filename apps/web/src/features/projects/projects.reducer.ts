export type ProjectsDetailTab = 'deploy' | 'routes' | 'repos' | 'general';

export interface CreationProgress {
  done: number;
  total: number;
  label: string;
}

export interface ProjectsState {
  creating: boolean;
  submitting: boolean;
  newName: string;
  newDescription: string;
  progress: CreationProgress | null;
  editName: string | null;
  editDescription: string | null;
  editSubmitting: boolean;
  editSaved: boolean;
  editMessage: string | null;
  panelError: string | null;
}

export type ProjectsAction =
  | { type: 'panel-error-set'; message: string | null }
  | { type: 'creation-opened' }
  | { type: 'creation-cancelled' }
  | { type: 'name-changed'; name: string }
  | { type: 'description-changed'; description: string }
  | { type: 'creation-submitting' }
  | { type: 'creation-progress'; done: number; total: number; label: string }
  | { type: 'creation-failed' }
  | { type: 'creation-succeeded' }
  | { type: 'edit-name-changed'; name: string }
  | { type: 'edit-description-changed'; description: string }
  | { type: 'edit-reset' }
  | { type: 'edit-submitting' }
  | { type: 'edit-succeeded' }
  | { type: 'edit-failed'; message: string };

export const initialProjectsState: ProjectsState = {
  creating: false,
  submitting: false,
  newName: '',
  newDescription: '',
  progress: null,
  editName: null,
  editDescription: null,
  editSubmitting: false,
  editSaved: false,
  editMessage: null,
  panelError: null,
};

export function projectsReducer(
  state: ProjectsState,
  action: ProjectsAction,
): ProjectsState {
  switch (action.type) {
    case 'panel-error-set':
      return { ...state, panelError: action.message };
    case 'creation-opened':
      return { ...state, creating: true };
    case 'creation-cancelled':
      return {
        ...state,
        creating: false,
        newName: '',
        newDescription: '',
      };
    case 'name-changed':
      return { ...state, newName: action.name };
    case 'description-changed':
      return { ...state, newDescription: action.description };
    case 'creation-submitting':
      return { ...state, submitting: true, progress: null };
    case 'creation-progress':
      return {
        ...state,
        progress: {
          done: action.done,
          total: action.total,
          label: action.label,
        },
      };
    case 'creation-failed':
      return {
        ...state,
        submitting: false,
        progress: null,
      };
    case 'creation-succeeded':
      return {
        ...state,
        submitting: false,
        creating: false,
        newName: '',
        newDescription: '',
        progress: null,
      };
    case 'edit-name-changed':
      return { ...state, editName: action.name, editSaved: false };
    case 'edit-description-changed':
      return {
        ...state,
        editDescription: action.description,
        editSaved: false,
      };
    case 'edit-reset':
      return {
        ...state,
        editName: null,
        editDescription: null,
        editSaved: false,
        editMessage: null,
      };
    case 'edit-submitting':
      return { ...state, editSubmitting: true, editMessage: null };
    case 'edit-succeeded':
      return {
        ...state,
        editSubmitting: false,
        editName: null,
        editDescription: null,
        editSaved: true,
        editMessage: null,
      };
    case 'edit-failed':
      return { ...state, editSubmitting: false, editMessage: action.message };
  }
}
