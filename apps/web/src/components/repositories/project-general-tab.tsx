import { useProjectEditing } from '@neoglito/web/hooks/projects/use-project-editing'
import type { Project } from '@neoglito/web/models/project'
import {
  useProjectsDispatch,
  useProjectsState,
} from '@neoglito/web/state/projects/projects.context'

interface ProjectGeneralTabProps {
  project: Project
}

export function ProjectGeneralTab({ project }: ProjectGeneralTabProps) {
  const dispatch = useProjectsDispatch()
  const { editSubmitting, editSaved, editMessage } = useProjectsState()
  const {
    editName: name,
    editDescription: description,
    editNameTaken: nameTaken,
    editClean: clean,
    handleSaveGeneral,
  } = useProjectEditing()

  const submitting = editSubmitting
  const saved = editSaved
  const message = editMessage
  const meta = `Creado ${project.createdAt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const onNameChange = (value: string) =>
    dispatch({ type: 'edit-name-changed', name: value })
  const onDescriptionChange = (value: string) =>
    dispatch({ type: 'edit-description-changed', description: value })
  const onReset = () => dispatch({ type: 'edit-reset' })
  const onSave = () => void handleSaveGeneral()

  const cantSave = clean || nameTaken || !name.trim() || !description.trim()

  return (
    <div className='flex max-w-[560px] flex-col gap-5'>
      <div className='flex flex-col gap-1.5'>
        <label
          htmlFor='ed-name'
          className='text-[12.5px] font-semibold text-[#51607a] dark:text-[#a7b4c8]'
        >
          Nombre del proyecto{' '}
          <span className='text-[#c2410c] dark:text-[#fb923c]'>*</span>
        </label>
        <input
          id='ed-name'
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className='h-10 rounded-lg border border-[#d6dce5] bg-white px-3 text-[13.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#e8edf6]'
        />
        <span
          className={`text-[12px] ${nameTaken ? 'text-[#c2410c] dark:text-[#fb923c]' : 'text-[#8c98ac] dark:text-[#7a8699]'}`}
        >
          {nameTaken
            ? 'Ya existe un proyecto con ese nombre.'
            : saved
              ? 'Cambios guardados.'
              : 'Debe ser único.'}
        </span>
      </div>

      <div className='flex flex-col gap-1.5'>
        <label
          htmlFor='ed-desc'
          className='text-[12.5px] font-semibold text-[#51607a] dark:text-[#a7b4c8]'
        >
          Descripción <span className='text-[#c2410c] dark:text-[#fb923c]'>*</span>
        </label>
        <textarea
          id='ed-desc'
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className='min-h-[96px] resize-none rounded-lg border border-[#d6dce5] bg-white px-3 py-2 text-[13.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#e8edf6]'
        />
      </div>

      {message && (
        <p className='text-[12.5px] text-[#c2410c] dark:text-[#fb923c]'>
          {message}
        </p>
      )}

      <div className='flex flex-wrap items-center justify-between gap-3 border-t border-[#e6eaf0] pt-4 dark:border-[#253044]'>
        <span className='text-[12.5px] text-[#8c98ac] dark:text-[#7a8699]'>
          {meta}
        </span>
        <div className='flex gap-2'>
          <button
            type='button'
            disabled={clean}
            onClick={onReset}
            className='h-9 rounded-lg border border-[#d6dce5] bg-white px-4 text-[13px] font-semibold text-[#51607a] enabled:hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#35435a] dark:bg-[#111826] dark:text-[#c1cbe0]'
          >
            Descartar
          </button>
          <button
            type='button'
            disabled={cantSave || submitting}
            onClick={onSave}
            className='h-9 rounded-lg bg-[#2257c4] px-4 text-[13px] font-semibold text-white enabled:hover:bg-[#1c489f] disabled:cursor-not-allowed disabled:opacity-50'
          >
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
