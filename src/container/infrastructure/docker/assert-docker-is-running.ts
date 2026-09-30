import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const DOCKER_INFO_ARGS = ['info', '--format', '{{.ServerVersion}}'];

function getDockerCandidates(): string[] {
  return [
    process.env.DOCKER_PATH,
    'docker',
    'docker.exe',
    'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
  ].filter((candidate): candidate is string => Boolean(candidate));
}

function canTryDockerCandidate(candidate: string): boolean {
  return candidate === 'docker' || candidate === 'docker.exe' || existsSync(candidate);
}

/**
 * Clase para la validacion de la existencia de docker antes de inicializar la aplicacion
 */
export function assertDockerIsRunning(): void {
  let lastError: NodeJS.ErrnoException | undefined;
  let lastOutput = '';

  for (const dockerCommand of getDockerCandidates()) {
    if (!canTryDockerCandidate(dockerCommand)) {
      continue;
    }

    /**
     * Ejecuta de manera sincrona en terminal el comando
     *  | docker info --format {{.ServerVersion}}
     */
    const result = spawnSync(dockerCommand, DOCKER_INFO_ARGS, {
      encoding: 'utf8',
      timeout: 10_000,
    });

    // Se puede tratar de un error conocido por node o algo ajeno a ello
    const error = result.error as NodeJS.ErrnoException | undefined;
    lastError = error;
    lastOutput = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();

    if (error?.code === 'ENOENT') {
      continue;
    }

    // Error desconocido
    if (error) {
      throw new Error(`No se pudo verificar Docker: ${error.message}`);
    }

    if (result.status === 0) {
      return;
    }

    break;
  }

  // El codigo ENOENT es conocido por nosotros, docker es completamente ajeno al os donde se esta ejecutando la app
  if (lastError?.code === 'ENOENT') {
    throw new Error(
      'Docker no esta instalado o no esta disponible para Node. Agrega docker al PATH o define DOCKER_PATH con la ruta completa a docker.exe.',
    );
  }

  /**
   * Si ningun candidato responde con status 0, docker existe pero el daemon no esta disponible.
   */
  const message =
    'Docker esta instalado, pero el daemon no esta disponible. Abre Docker Desktop o inicia el servicio de Docker antes de arrancar la aplicacion.';

  throw new Error(lastOutput ? `${message}\n\n${lastOutput}` : message);
}
