import type { DeployEnvVar } from "@neoglito/web/state/deploys/deploys.reducer"
import { getMissingRequiredEnvCount } from "@neoglito/web/utils/deploys/compose.helpers"
import { DeployFileListItem } from "@neoglito/web/components/repositories/deploy-file-list-item"
import { shortName } from "@neoglito/web/utils/repository-name"

export interface DeployFileListRepository {
  id: number
  name: string
}

interface DeployFileListProps {
  projectId: number
  repositories: DeployFileListRepository[]
  deployPaths: Record<string, string>
  deployEnv: Record<string, DeployEnvVar[]>
  selectedKey: string
  onSelect(key: string): void
}

export function DeployFileList({
  projectId,
  repositories,
  deployPaths,
  deployEnv,
  selectedKey,
  onSelect,
}: DeployFileListProps) {
  return (
    <div className='flex flex-1 flex-col gap-2 sm:min-w-[220px] sm:max-w-[300px]'>
      <span className='text-[12px] font-bold uppercase tracking-[0.08em] text-[#8c98ac] dark:text-[#7a8699]'>
        Archivos de despliegue
      </span>
      <div className='flex flex-col gap-2'>
        {repositories.map((repository) => {
          const key = `${projectId}:${repository.id}`
          const path = (deployPaths[key] ?? '').trim()
          const missing = getMissingRequiredEnvCount(deployEnv[key] ?? [])

          const statusLabel = !path
            ? 'Sin ruta'
            : missing > 0
              ? `Faltan ${missing}`
              : 'Listo'

          return (
            <DeployFileListItem
              key={repository.id}
              repositoryName={shortName(repository.name)}
              fileName={path || 'Sin archivo de despliegue'}
              statusLabel={statusLabel}
              ready={Boolean(path) && missing === 0}
              selected={selectedKey === key}
              onSelect={() => onSelect(key)}
            />
          )
        })}
      </div>
    </div>
  )
}
