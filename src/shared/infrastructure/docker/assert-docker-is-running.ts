import { spawnSync } from 'node:child_process';

export function assertDockerIsRunning(): void {
  const result = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
    encoding: 'utf8',
    timeout: 10_000,
  });

  const error = result.error as NodeJS.ErrnoException | undefined;

  if (error?.code === 'ENOENT') {
    throw new Error(
      'Docker no esta instalado o no esta disponible en el PATH. Instala Docker Desktop y vuelve a intentar iniciar la aplicacion.',
    );
  }

  if (error) {
    throw new Error(`No se pudo verificar Docker: ${error.message}`);
  }

  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    const message =
      'Docker esta instalado, pero el daemon no esta disponible. Abre Docker Desktop o inicia el servicio de Docker antes de arrancar la aplicacion.';

    throw new Error(details ? `${message}\n\n${details}` : message);
  }
}
