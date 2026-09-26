import { spawnSync } from 'node:child_process';

/**
 * Clase para la validacion de la existencia de docker antes de inicializar la aplicacion
 */
export function assertDockerIsRunning(): void {
  /**
   * Ejecuta de manera sincrona en terminal el comando 
   *  | docker info --format {{.ServerVersion}}
   */
  const result = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
    encoding: 'utf8',
    timeout: 10_000,
  });

  // Se puede tratar de un error conocido por node o algo ajeno a ello
  const error = result.error as NodeJS.ErrnoException | undefined;

  // El codigo ENOENT es conocido por nosotros, docker es completamente ajeno al os donde se esta ejecutando la app
  if (error?.code === 'ENOENT') {
    throw new Error(
      'Docker no esta instalado o no esta disponible en el PATH. Instala Docker Desktop y vuelve a intentar iniciar la aplicacion.',
    );
  }

  // Error desconocido
  if (error) {
    throw new Error(`No se pudo verificar Docker: ${error.message}`);
  }

  /**
   * El status 0 nos indica que docker si se encuentra en el path pero el proceso esta apagado
   */
  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    const message =
      'Docker esta instalado, pero el daemon no esta disponible. Abre Docker Desktop o inicia el servicio de Docker antes de arrancar la aplicacion.';

    throw new Error(details ? `${message}\n\n${details}` : message);
  }
}
