import { BadRequestException } from '@nestjs/common';
import { isRecord } from '../../../shared/application/compose-ports.js';

export interface MirroredPort {
  service: string;
  previous: number;
  current: number;
  previousPublished: number | null;
}

function environmentMap(
  service: Record<string, unknown>,
): Record<string, unknown> {
  const environment = Object.create(null) as Record<string, unknown>;
  if (isRecord(service.environment))
    Object.assign(environment, service.environment);
  if (Array.isArray(service.environment)) {
    for (const entry of service.environment as unknown[]) {
      if (typeof entry !== 'string') continue;
      const separator = entry.indexOf('=');
      environment[separator < 0 ? entry : entry.slice(0, separator)] =
        separator < 0 ? null : entry.slice(separator + 1);
    }
  }
  service.environment = environment;
  return environment;
}

function serverCommand(
  command: unknown,
  executable: string,
  flag: string,
  port: number,
): unknown {
  if (command === undefined || command === null)
    return [executable, flag, String(port)];
  if (
    Array.isArray(command) &&
    command.every((argument: unknown) => typeof argument === 'string')
  ) {
    const args = [...command] as string[];
    if (args[0] !== executable && !args[0]?.startsWith('-'))
      throw new BadRequestException(
        `No se puede adaptar automáticamente el comando de ${executable}`,
      );
    const index = args.indexOf(flag);
    if (index >= 0) args.splice(index, 2, flag, String(port));
    else args.push(flag, String(port));
    return args;
  }
  if (typeof command === 'string' && !/["'\n;&|]/.test(command)) {
    return serverCommand(command.trim().split(/\s+/), executable, flag, port);
  }
  throw new BadRequestException(
    `El modo espejo requiere configurar el listener de ${executable}`,
  );
}

function viteCommand(command: unknown, port: number): unknown {
  const update = (text: string): string | null => {
    if (!/\bvite\b|@neoglito\/web.*\brun dev\b/.test(text)) return null;
    if (/--port(?:=|\s+)\d+/.test(text))
      return text.replace(/--port(?:=|\s+)\d+/, `--port ${port}`);
    if (/--host(?:=|\s+)[\w.:-]+/.test(text))
      return text.replace(
        /--host(?:=|\s+)[\w.:-]+/,
        (host) => `${host} --port ${port}`,
      );
    if (/\bvite\b/.test(text))
      return text.replace(/\bvite\b/, `vite --port ${port}`);
    return null;
  };
  if (typeof command === 'string') return update(command);
  if (Array.isArray(command)) {
    if (
      command[0] === 'vite' ||
      (command[0] === 'npm' &&
        command.includes('@neoglito/web') &&
        command.includes('dev'))
    ) {
      const args = [...command] as string[];
      const index = args.indexOf('--port');
      if (index >= 0) args.splice(index, 2, '--port', String(port));
      else args.push('--port', String(port));
      return args;
    }
    let changed = false;
    const updated = command.map((argument: unknown) => {
      if (typeof argument !== 'string') return argument;
      const next = update(argument);
      if (next !== null) changed = true;
      return next ?? argument;
    });
    if (changed) return updated;
  }
  return null;
}

export function configureMirroredServicePorts(
  services: Record<string, unknown>,
  changes: MirroredPort[],
): void {
  const byService = new Map<string, MirroredPort>();
  for (const change of changes) {
    const previous = byService.get(change.service);
    if (previous && previous.current !== change.current)
      throw new BadRequestException(
        `El modo espejo no admite varios listeners automáticos en ${change.service}`,
      );
    byService.set(change.service, change);
  }
  for (const [name, change] of byService) {
    if (change.previous === change.current) continue;
    const service = services[name] as Record<string, unknown>;
    const image =
      typeof service.image === 'string'
        ? service.image.split('/').at(-1)?.split(/[:@]/)[0]
        : '';
    const command = service.command;
    const environment = environmentMap(service);
    if (image === 'postgres') {
      service.command = serverCommand(
        command,
        'postgres',
        '-p',
        change.current,
      );
      environment.PGPORT = String(change.current);
    } else if (image === 'redis') {
      service.command = serverCommand(
        command,
        'redis-server',
        '--port',
        change.current,
      );
      if (
        isRecord(service.healthcheck) &&
        Array.isArray(service.healthcheck.test)
      ) {
        const test = service.healthcheck.test as unknown[];
        if (test[0] === 'CMD' && test[1] === 'redis-cli') {
          const args = test.slice(2) as string[];
          const portIndex = args.indexOf('-p');
          if (portIndex >= 0) args.splice(portIndex, 2);
          service.healthcheck = {
            ...service.healthcheck,
            test: ['CMD', 'redis-cli', '-p', String(change.current), ...args],
          };
        } else {
          throw new BadRequestException(
            `Configura el healthcheck de ${name} para el puerto ${change.current}`,
          );
        }
      }
    } else {
      const vite = viteCommand(command, change.current);
      if (vite !== null) {
        service.command = vite;
        environment.PORT = String(change.current);
      } else if (
        Object.hasOwn(environment, 'PORT') ||
        /\bnpm\b.*\brun start(?::[\w-]+)?\b/.test(
          typeof command === 'string'
            ? command
            : Array.isArray(command)
              ? command.join(' ')
              : '',
        )
      ) {
        environment.PORT = String(change.current);
      } else {
        throw new BadRequestException(
          `No se conoce cómo cambiar el listener de ${name}; configura PORT o su comando antes de usar el modo espejo`,
        );
      }
    }
    if (Array.isArray(service.expose)) {
      service.expose = service.expose.map((port: unknown) =>
        String(port) === String(change.previous)
          ? String(change.current)
          : port,
      );
    }
  }
  // Solo se ajustan URLs cuyo host/puerto identifica un servicio de este Compose.
  for (const service of Object.values(services)) {
    if (!isRecord(service)) continue;
    const environment = environmentMap(service);
    for (const [key, value] of Object.entries(environment)) {
      if (typeof value !== 'string') continue;
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        continue;
      }
      const oldPort = Number(url.port);
      if (!oldPort) continue;
      const local = ['localhost', '127.0.0.1', 'host.docker.internal'].includes(
        url.hostname,
      );
      const matches = changes.filter((change) => {
        const target = services[change.service] as Record<string, unknown>;
        return local
          ? (change.previousPublished ?? change.previous) === oldPort
          : (url.hostname === change.service ||
              url.hostname === target.container_name) &&
              change.previous === oldPort;
      });
      if (matches.length === 1) {
        environment[key] = value.replace(
          new RegExp(`(:\\/\\/[^/?#]*):${oldPort}(?=[/?#]|$)`),
          (_match, authority: string) => `${authority}:${matches[0].current}`,
        );
      }
    }
  }
}
