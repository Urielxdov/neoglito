import { useMemo } from 'react';
import { X } from 'lucide';
import type {
  DeployComposePort,
  DeployEnvVar,
} from '@neoglito/web/state/deploys/deploys.reducer';
import { AppIcon } from '@neoglito/web/components/ui/app-icon';
import { usePorts } from '@neoglito/web/hooks/ports/use-ports';
import { DeployPortField } from '@neoglito/web/components/repositories/deploy-port-field';
import { parseReservations } from '@neoglito/web/utils/ports/port-reservations';

interface DeployFileDetailProps {
  projectId: number;
  repositoryName: string;
  path: string;
  candidates: string[];
  env: DeployEnvVar[];
  ports: Array<{ port: DeployComposePort; index: number }>;
  onPathChange(path: string): void;
  onEnvAdd(): void;
  onEnvRemove(index: number): void;
  onEnvChange(index: number, field: 'key' | 'value', value: string): void;
  onPortChange(
    index: number,
    dockerComposePath: string,
    publishedPort: string,
  ): void;
}

export function DeployFileDetail({
  projectId,
  repositoryName,
  path,
  candidates,
  env,
  ports,
  onPathChange,
  onEnvAdd,
  onEnvRemove,
  onEnvChange,
  onPortChange,
}: DeployFileDetailProps) {
  const { reservedPorts, isLoading, isError } = usePorts();
  const reservations = useMemo(
    () => parseReservations(reservedPorts),
    [reservedPorts],
  );
  const canCheckPorts = !isLoading && !isError;

  return (
    <div className="flex flex-1 flex-col gap-6 rounded-lg border border-[#e0e6ef] bg-white p-5 dark:border-[#253044] dark:bg-[#111826] sm:min-w-[320px]">
      <span className="text-[14px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
        {repositoryName}
      </span>

      <div className="flex flex-col gap-2.5">
        <span className="text-[12px] font-bold uppercase tracking-[0.09em] text-[#51607a] dark:text-[#a7b4c8]">
          Ruta del archivo
        </span>
        <input
          value={path}
          onChange={(event) => onPathChange(event.target.value)}
          placeholder="ruta/al/Dockerfile"
          className="h-10 rounded-lg border border-[#d6dce5] bg-white px-3 font-mono text-[13px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#0c121d] dark:text-[#e8edf6]"
        />
        <span className="text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
          {candidates.length > 1
            ? 'Hay varios archivos; elige uno o escribe otra ruta.'
            : candidates.length === 0
              ? 'Escribe la ruta relativa a la raíz del repositorio.'
              : 'Ruta relativa a la raíz del repositorio. Puedes cambiarla.'}
        </span>
        {candidates.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {candidates.map((candidate) => (
              <button
                key={candidate}
                type="button"
                onClick={() => onPathChange(candidate)}
                className={`rounded-md border px-2.5 py-[5px] font-mono text-[12px] ${
                  candidate === path
                    ? 'border-[#2257c4] bg-[#eef3fc] text-[#2257c4] dark:border-[#5b8df5] dark:bg-[#18243a] dark:text-[#5b8df5]'
                    : 'border-[#d6dce5] bg-white text-[#51607a] hover:bg-[#f8fafc] dark:border-[#35435a] dark:bg-[#0c121d] dark:text-[#a7b4c8] dark:hover:bg-[#1a2334]'
                }`}
              >
                {candidate}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.09em] text-[#51607a] dark:text-[#a7b4c8]">
            Puertos · {ports.length}
          </span>
          <span className="h-px flex-1 bg-[#e6eaf0] dark:bg-[#253044]" />
        </div>

        {ports.length === 0 ? (
          <span className="text-[12px] text-[#8c98ac] dark:text-[#7a8699]">
            Este archivo no declara puertos. Puedes continuar sin asignarlos.
          </span>
        ) : (
          <div className="flex flex-col gap-2">
            {ports.map(({ port, index }) => (
              <div
                key={`${port.dockerComposePath}:${index}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e0e6ef] p-2.5 dark:border-[#253044]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[12px] font-semibold text-[#16202e] dark:text-[#e8edf6]">
                    {port.service} · {port.targetPort}/{port.protocol}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-[#8c98ac] dark:text-[#7a8699]">
                    {port.mappingType === 'range'
                      ? 'Rango'
                      : 'Puerto individual'}
                    {port.hostIp ? ` · ${port.hostIp}` : ''}
                  </span>
                </span>
                <DeployPortField
                  projectId={projectId}
                  port={port}
                  reservations={reservations}
                  canCheckPorts={canCheckPorts}
                  onChange={(publishedPort) =>
                    onPortChange(index, port.dockerComposePath, publishedPort)
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-bold uppercase tracking-[0.09em] text-[#51607a] dark:text-[#a7b4c8]">
            Variables de entorno · {env.length}
          </span>
          <span className="h-px flex-1 bg-[#e6eaf0] dark:bg-[#253044]" />
        </div>

        <div className="flex flex-col gap-2">
          {env.map((row, rowIndex) => (
            <div key={rowIndex} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  value={row.key}
                  onChange={(event) =>
                    onEnvChange(rowIndex, 'key', event.target.value)
                  }
                  placeholder="NOMBRE_VARIABLE"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-[#d6dce5] bg-white px-2.5 font-mono text-[12.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#0c121d] dark:text-[#e8edf6]"
                />
                <input
                  value={row.value}
                  onChange={(event) =>
                    onEnvChange(rowIndex, 'value', event.target.value)
                  }
                  placeholder="valor"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-[#d6dce5] bg-white px-2.5 text-[12.5px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] focus:border-[#2257c4] dark:border-[#35435a] dark:bg-[#0c121d] dark:text-[#e8edf6]"
                />
                <button
                  type="button"
                  onClick={() => onEnvRemove(rowIndex)}
                  aria-label="Eliminar variable"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d6dce5] bg-white text-[#8c98ac] hover:bg-[#f1f5f9] dark:border-[#35435a] dark:bg-[#0c121d] dark:text-[#7a8699]"
                >
                  <AppIcon icon={X} size={13} strokeWidth={2.2} />
                </button>
              </div>
              <span
                className={`text-[11.5px] ${
                  row.required
                    ? 'text-[#a4550a] dark:text-[#f0a458]'
                    : 'text-[#8c98ac] dark:text-[#7a8699]'
                }`}
              >
                {row.required
                  ? row.value.trim()
                    ? 'Requerida'
                    : 'Requerida · sin valor'
                  : 'Opcional'}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onEnvAdd}
          className="self-start rounded-lg border border-dashed border-[#c8d0dc] px-3 py-1.5 text-[12.5px] font-semibold text-[#51607a] hover:bg-[#f8fafc] dark:border-[#3b4860] dark:text-[#a7b4c8] dark:hover:bg-[#0c121d]"
        >
          + Agregar variable
        </button>
      </div>
    </div>
  );
}
