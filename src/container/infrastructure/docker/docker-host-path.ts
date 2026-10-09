import { posix } from 'node:path';

export interface DockerMount {
  type: string;
  source: string;
  destination: string;
}

/** El daemon de Docker Desktop comparte las unidades Windows en esta ruta Linux. */
function daemonSource(source: string): string {
  if (/^[a-zA-Z]:[\\/]/.test(source)) {
    return `/run/desktop/mnt/host/${source[0].toLowerCase()}${source.slice(2).replace(/\\/g, '/')}`;
  }
  return source;
}

export function resolveDockerHostPath(
  path: string,
  mounts: readonly DockerMount[],
): string {
  const normalized = posix.resolve(path);
  const mount = [...mounts]
    .sort((left, right) => right.destination.length - left.destination.length)
    .find(
      (mount) =>
        normalized === mount.destination ||
        normalized.startsWith(`${mount.destination.replace(/\/$/, '')}/`),
    );
  if (!mount || mount.type !== 'bind') {
    throw new Error(
      `La ruta ${path} no está compartida con el host de Docker mediante un bind mount`,
    );
  }
  return posix.join(
    daemonSource(mount.source),
    posix.relative(mount.destination, normalized),
  );
}
