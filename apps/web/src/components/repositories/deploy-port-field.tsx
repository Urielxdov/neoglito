import { Check, X } from 'lucide';
import type { DeployComposePort } from '@neoglito/web/state/deploys/deploys.reducer';
import { AppIcon } from '@neoglito/web/components/ui/app-icon';
import { usePortReservation } from '@neoglito/web/hooks/ports/use-port-reservation';
import { checkPublishedPort } from '@neoglito/web/utils/ports/port-reservations';
import type {
  PortCheck,
  PortReservation,
} from '@neoglito/web/utils/ports/port-reservations';

const NO_CHECK: PortCheck = { status: 'empty' };

type Tone = 'neutral' | 'green' | 'amber' | 'red';

const BORDER: Record<Tone, string> = {
  neutral: 'border-[#d6dce5] focus:border-[#2257c4] dark:border-[#35435a]',
  green:
    'border-[#7cc79b] focus:border-[#1d7a45] dark:border-[#2f7a52] dark:focus:border-[#5fcf8f]',
  amber:
    'border-[#e3b27a] focus:border-[#a4550a] dark:border-[#8a5a24] dark:focus:border-[#f0a458]',
  red: 'border-[#e59a9a] focus:border-[#b42318] dark:border-[#8a3a3a] dark:focus:border-[#f08a8a]',
};

const TEXT: Record<Tone, string> = {
  neutral: 'text-[#8c98ac] dark:text-[#7a8699]',
  green: 'text-[#1d7a45] dark:text-[#5fcf8f]',
  amber: 'text-[#a4550a] dark:text-[#f0a458]',
  red: 'text-[#b42318] dark:text-[#f08a8a]',
};

function reservedMessage(check: Extract<PortCheck, { status: 'reserved' }>) {
  return check.conflicts.length === 1
    ? `⚠ Reservado por ${check.conflicts[0].owner}`
    : `⚠ Reservados: ${check.conflicts
        .map(({ port, owner }) => `${port} por ${owner}`)
        .join(' · ')}`;
}

interface DeployPortFieldProps {
  projectId: number;
  port: DeployComposePort;
  reservations: PortReservation[];
  canCheckPorts: boolean;
  onChange(publishedPort: string): void;
}

export function DeployPortField({
  projectId,
  port,
  reservations,
  canCheckPorts,
  onChange,
}: DeployPortFieldProps) {
  const check = canCheckPorts
    ? checkPublishedPort(port.publishedPort, reservations)
    : NO_CHECK;
  const reservation = usePortReservation(
    projectId,
    port.publishedPort,
    check.status === 'reserved',
  );

  const pending = reservation.status === 'pending';

  let tone: Tone = 'neutral';
  let message: string | null = null;
  if (reservation.status === 'reserved') {
    tone = 'green';
    message = 'Puerto reservado';
  } else if (pending) {
    message = 'Reservando puerto…';
  } else if (check.status === 'reserved') {
    tone = 'amber';
    message = reservedMessage(check);
  } else if (reservation.status === 'failed') {
    tone = 'red';
    message = `✕ ${reservation.message}`;
  } else if (check.status === 'free') {
    tone = 'green';
    message = 'Puerto no reservado por Neoglito';
  }

  return (
    <>
      <label className="flex items-center gap-2 text-[11.5px] text-[#51607a] dark:text-[#a7b4c8]">
        Puerto del host
        <input
          value={port.publishedPort ?? ''}
          onChange={(event) => onChange(event.target.value)}
          readOnly={pending}
          aria-busy={pending}
          placeholder={port.mappingType === 'range' ? '8000-8002' : '5173'}
          inputMode="numeric"
          className={`h-8 w-[112px] rounded-md border bg-white px-2 font-mono text-[12px] text-[#16202e] outline-none placeholder:text-[#a7b4c8] dark:bg-[#0c121d] dark:text-[#e8edf6] ${BORDER[tone]} ${
            pending ? 'cursor-wait opacity-60' : ''
          }`}
        />
        <span className="grid h-4 w-4 place-items-center">
          {pending && (
            <span
              role="status"
              aria-label="Reservando puerto"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#c8d0dc] border-t-[#2257c4] dark:border-[#35435a] dark:border-t-[#5b8df5]"
            />
          )}
          {reservation.status === 'reserved' && (
            <span className={TEXT.green}>
              <AppIcon icon={Check} size={14} strokeWidth={2.6} />
            </span>
          )}
          {reservation.status === 'failed' && check.status !== 'reserved' && (
            <span className={TEXT.red}>
              <AppIcon icon={X} size={14} strokeWidth={2.6} />
            </span>
          )}
        </span>
      </label>
      {message && (
        <span className={`basis-full text-[11.5px] ${TEXT[tone]}`}>
          {message}
        </span>
      )}
    </>
  );
}
