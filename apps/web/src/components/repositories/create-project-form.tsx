interface CreateProjectFormProps {
  name: string
  description: string
  nameTaken: boolean
  selectedRepositoryNames: string[]
  canCreate: boolean
  submitting: boolean
  onNameChange(name: string): void
  onDescriptionChange(description: string): void
  onCancel(): void
  onCreate(): void
}

export function CreateProjectForm({
  name,
  description,
  nameTaken,
  selectedRepositoryNames,
  canCreate,
  submitting,
  onNameChange,
  onDescriptionChange,
  onCancel,
  onCreate,
}: CreateProjectFormProps) {
  return (
    <div className="flex flex-col gap-[14px] rounded-lg border border-[#c7d6f5] bg-[#f8fafc] p-[18px] dark:border-[#27385a] dark:bg-[#0c121d]">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="np-name" className="text-[12.5px] font-semibold text-[#51607a] dark:text-[#a7b4c8]">
          Nombre <span className="text-[#c2410c] dark:text-[#fb923c]">*</span>
        </label>
        <input
          id="np-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Facturación electrónica"
          className="h-10 rounded-lg border border-[#d6dce5] bg-white px-3 text-[13.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#e8edf6]"
        />
        <span className={`text-[12px] ${nameTaken ? 'text-[#c2410c] dark:text-[#fb923c]' : 'text-[#8c98ac] dark:text-[#7a8699]'}`}>
          {nameTaken ? 'Ya existe un proyecto con ese nombre.' : 'Debe ser único.'}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="np-desc" className="text-[12.5px] font-semibold text-[#51607a] dark:text-[#a7b4c8]">
          Descripción <span className="text-[#c2410c] dark:text-[#fb923c]">*</span>
        </label>
        <textarea
          id="np-desc"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Qué agrupa este proyecto"
          className="min-h-[74px] resize-none rounded-lg border border-[#d6dce5] bg-white px-3 py-2 text-[13.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#e8edf6]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-[#51607a] dark:text-[#a7b4c8]">
          Repositorios ({selectedRepositoryNames.length})
        </span>
        <div className="flex flex-wrap gap-1.5">
          {selectedRepositoryNames.map((repositoryName) => (
            <span
              key={repositoryName}
              className="rounded-md border border-[#e0e6ef] bg-white px-2 py-0.5 font-mono text-[12px] text-[#51607a] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#a7b4c8]"
            >
              {repositoryName}
            </span>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-lg border border-[#d6dce5] bg-white px-4 text-[13px] font-semibold text-[#51607a] hover:bg-[#f1f5f9] dark:border-[#35435a] dark:bg-[#111826] dark:text-[#c1cbe0]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={!canCreate || submitting}
          className="h-9 rounded-lg bg-[#2257c4] px-4 text-[13px] font-semibold text-white enabled:hover:bg-[#1c489f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Creando…' : 'Crear proyecto'}
        </button>
      </div>
    </div>
  )
}
