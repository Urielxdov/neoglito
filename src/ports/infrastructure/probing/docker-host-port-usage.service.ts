import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createConnection } from 'node:net';
import { promisify } from 'node:util';
import type {
  HostPortUsage,
  HostPortUsagePort,
} from '../../application/host-port-usage.port.js';

const execute = promisify(execFile);

/** Docker's published ports belong to the daemon host, not the API container. */
@Injectable()
export class DockerHostPortUsageService implements HostPortUsagePort {
  private inventory?: Promise<HostPortUsage[]>;

  getPublishedPorts(): Promise<HostPortUsage[]> {
    // Share concurrent requests without caching stale availability results.
    this.inventory ??= this.readPublishedPorts().finally(() => {
      this.inventory = undefined;
    });
    return this.inventory;
  }

  private async readPublishedPorts(): Promise<HostPortUsage[]> {
    try {
      const executable = process.env.DOCKER_PATH ?? 'docker';
      const options = {
        timeout: 10_000,
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024,
      };
      const { stdout: listing } = await execute(
        executable,
        ['container', 'ls', '--quiet'],
        options,
      );
      const ids = listing.trim().split(/\s+/).filter(Boolean);
      if (ids.length === 0) return [];
      const { stdout } = await execute(
        executable,
        [
          'container',
          'inspect',
          '--format',
          '{{json .Name}} {{json .NetworkSettings.Ports}}',
          ...ids,
        ],
        options,
      );
      const ports = new Map<string, HostPortUsage>();
      for (const line of stdout.trim().split(/\r?\n/)) {
        const separator = line.indexOf(' ');
        const name = (JSON.parse(line.slice(0, separator)) as string).replace(
          /^\//,
          '',
        );
        const bindings = JSON.parse(line.slice(separator + 1)) as Record<
          string,
          Array<{ HostPort: string }> | null
        > | null;
        for (const mappings of Object.values(bindings ?? {})) {
          for (const mapping of mappings ?? []) {
            const port = Number(mapping.HostPort);
            if (!Number.isInteger(port) || port < 1 || port > 65535) continue;
            const ownerId = `host:docker:${name}:port:${port}`;
            ports.set(ownerId, { port, ownerId });
          }
        }
      }
      return [...ports.values()];
    } catch (error) {
      throw new ServiceUnavailableException(
        'No se pudieron comprobar los puertos publicados por Docker',
        { cause: error },
      );
    }
  }

  async isPortAvailable(port: number): Promise<boolean> {
    if ((await this.getPublishedPorts()).some((usage) => usage.port === port))
      return false;
    const host =
      process.env.CONTAINER_PROBE_HOST ??
      (existsSync('/.dockerenv') ? 'host.docker.internal' : '127.0.0.1');
    return new Promise((resolve, reject) => {
      const socket = createConnection({ port, host });
      socket.setTimeout(1500);
      socket.once('connect', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('error', (error: NodeJS.ErrnoException) => {
        socket.destroy();
        if (error.code === 'ECONNREFUSED') resolve(true);
        else
          reject(
            new ServiceUnavailableException(
              `No se pudo comprobar el puerto ${port} en el host`,
              { cause: error },
            ),
          );
      });
      socket.once('timeout', () => {
        socket.destroy();
        reject(
          new ServiceUnavailableException(
            `Tiempo de espera agotado al comprobar el puerto ${port} en el host`,
          ),
        );
      });
    });
  }
}
