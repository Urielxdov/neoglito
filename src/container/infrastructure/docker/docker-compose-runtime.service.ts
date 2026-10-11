import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { hostname } from 'node:os';
import { readFile as readComposeFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { parse } from 'yaml';
import { resolveDockerHostPath, type DockerMount } from './docker-host-path.js';
import { INJECTED_SERVICE_PREFIX } from '../../../telemetry/application/ports/telemetry-injector.port.js';
import type {
  ContainerInspection,
  ContainerRuntimePort,
  ContainerRuntimeService,
} from '../../application/container-runtime.port.js';

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

const isPort = (port: number): boolean =>
  Number.isInteger(port) && port > 0 && port <= 65535;

@Injectable()
export class DockerComposeRuntime implements ContainerRuntimePort {
  private readonly logger = new Logger(DockerComposeRuntime.name);
  private hostMounts?: Promise<DockerMount[]>;

  async resolveHostPath(path: string): Promise<string> {
    if (!existsSync('/.dockerenv')) return path;
    this.hostMounts ??= this.runDocker(
      ['container', 'inspect', hostname()],
      undefined,
      10_000,
    ).then((output) => {
      const containers: unknown = JSON.parse(output);
      const container = asRecord(
        Array.isArray(containers) ? containers[0] : null,
      );
      const mounts = Array.isArray(container.Mounts) ? container.Mounts : [];
      return mounts.map((mount: unknown) => {
        const fields = asRecord(mount);
        return {
          type: typeof fields.Type === 'string' ? fields.Type : '',
          source: typeof fields.Source === 'string' ? fields.Source : '',
          destination:
            typeof fields.Destination === 'string' ? fields.Destination : '',
        };
      });
    });
    return resolveDockerHostPath(path, await this.hostMounts);
  }

  async up(
    path: string,
    dockerCompose: string,
    projectName?: string,
  ): Promise<void> {
    await this.runDockerCompose(
      path,
      dockerCompose,
      ['up', '--build', '-d'],
      projectName,
    );
  }

  async list(
    path: string,
    dockerCompose: string,
    projectName?: string,
  ): Promise<ContainerRuntimeService[]> {
    const output = await this.runDockerCompose(
      path,
      dockerCompose,
      ['ps', '--all', '--format', 'json'],
      projectName,
    );
    let entries: unknown[];
    try {
      const parsed: unknown = JSON.parse(output);
      entries = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      entries = output
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as unknown);
    }
    return entries
      .map((entry) => {
        const item = entry as Record<string, unknown>;
        const asText = (value: unknown, fallback: string) =>
          typeof value === 'string' ? value : fallback;
        const rawStatus = asText(item.State, 'created').toLowerCase();
        const rawHealth = asText(item.Health, 'none').toLowerCase();
        const status = [
          'created',
          'running',
          'paused',
          'restarting',
          'exited',
          'dead',
        ].includes(rawStatus)
          ? rawStatus
          : 'created';
        const health = ['starting', 'healthy', 'unhealthy', 'none'].includes(
          rawHealth,
        )
          ? rawHealth
          : 'none';
        const publishers = Array.isArray(item.Publishers)
          ? (item.Publishers as Array<Record<string, unknown>>)
          : [];
        const port = publishers
          .filter(
            (publisher) =>
              publisher.Protocol === undefined || publisher.Protocol === 'tcp',
          )
          .map((publisher) => publisher.PublishedPort)
          .find(
            (publishedPort): publishedPort is number =>
              typeof publishedPort === 'number' && isPort(publishedPort),
          );
        return {
          containerId: asText(item.ID ?? item.Id, ''),
          composeServiceName: asText(item.Service, ''),
          port: port ?? 0,
          status: status as ContainerRuntimeService['status'],
          health: health as ContainerRuntimeService['health'],
        };
      })
      // Los servicios init del inyector de telemetría no son parte del despliegue del usuario.
      .filter(
        (item) =>
          item.containerId &&
          !item.composeServiceName.startsWith(INJECTED_SERVICE_PREFIX),
      );
  }

  async inspect(
    containerIds: readonly string[],
  ): Promise<ContainerInspection[]> {
    if (containerIds.length === 0) return [];
    const output = await this.runDocker(
      ['container', 'inspect', ...containerIds],
      undefined,
      10_000,
    );
    const entries: unknown = JSON.parse(output);
    if (!Array.isArray(entries))
      throw new Error('Docker no devolvió una lista de contenedores');

    return entries.map((entry: unknown) => {
      const item = asRecord(entry);
      const config = asRecord(item.Config);
      const networks = asRecord(asRecord(item.NetworkSettings).Networks);
      const labels = asRecord(config.Labels);
      // `docker compose ps` identifica los contenedores con el ID corto (12
      // caracteres); `docker container inspect` siempre devuelve el ID
      // completo. Truncamos aquí para que coincidan con el `service.id`
      // guardado en base de datos y con el resto de IDs usados en el sistema.
      const containerId =
        typeof item.Id === 'string' ? item.Id.slice(0, 12) : '';
      if (!containerId)
        throw new Error('Docker devolvió un contenedor sin identificador');

      const aliases = [
        typeof labels['com.docker.compose.service'] === 'string'
          ? labels['com.docker.compose.service']
          : '',
        typeof item.Name === 'string' ? item.Name.replace(/^\//, '') : '',
        ...Object.values(networks).flatMap((network) =>
          asStrings(asRecord(network).Aliases),
        ),
      ].filter(Boolean);
      const env: Record<string, string> = {};
      for (const variable of asStrings(config.Env)) {
        const separator = variable.indexOf('=');
        if (separator > 0)
          env[variable.slice(0, separator)] = variable.slice(separator + 1);
      }

      const bindings = asRecord(asRecord(item.NetworkSettings).Ports);
      const ports = Object.entries(bindings).flatMap(([internal, values]) => {
        if (!internal.endsWith('/tcp') || !Array.isArray(values)) return [];
        return values.flatMap((value: unknown) => {
          const port = Number(asRecord(value).HostPort);
          return isPort(port) ? [port] : [];
        });
      });

      return {
        containerId,
        image: typeof config.Image === 'string' ? config.Image : '',
        aliases: [...new Set(aliases)],
        ports: [...new Set(ports)],
        command: [...asStrings(config.Entrypoint), ...asStrings(config.Cmd)],
        env,
      };
    });
  }

  async readFile(containerId: string, path: string): Promise<string | null> {
    try {
      return await this.runDocker(
        ['exec', containerId, 'cat', path],
        undefined,
        5_000,
      );
    } catch {
      return null;
    }
  }

  async listFiles(containerId: string, directory: string): Promise<string[]> {
    try {
      const output = await this.runDocker(
        ['exec', containerId, 'ls', '-1', directory],
        undefined,
        5_000,
      );
      return output.split(/\r?\n/).filter(Boolean);
    } catch {
      return [];
    }
  }

  async down(
    path: string,
    dockerCompose: string,
    projectName?: string,
  ): Promise<void> {
    await this.runDockerCompose(path, dockerCompose, ['down'], projectName);
  }

  async delete(
    path: string,
    dockerCompose: string,
    projectName?: string,
  ): Promise<void> {
    await this.runDockerCompose(
      path,
      dockerCompose,
      ['down', '--volumes', '--remove-orphans'],
      projectName,
    );
  }

  private async runDockerCompose(
    path: string,
    dockerCompose: string,
    command: string[],
    projectName?: string,
  ): Promise<string> {
    let projectDirectory: string | undefined;
    if (projectName) {
      const document = asRecord(
        parse(await readComposeFile(dockerCompose, 'utf8')),
      );
      const metadata = asRecord(document['x-neoglito']);
      if (
        typeof metadata.projectDirectory !== 'string' ||
        !isAbsolute(metadata.projectDirectory)
      ) {
        throw new Error(
          'El Compose del despliegue no declara su directorio de proyecto',
        );
      }
      projectDirectory = metadata.projectDirectory;
    }
    const args = [
      'compose',
      ...(projectName ? ['-p', projectName] : []),
      ...(projectDirectory ? ['--project-directory', projectDirectory] : []),
      '-f',
      dockerCompose,
      ...command,
    ];
    this.logger.log(
      `[docker:compose] Ejecutando ${JSON.stringify({ executable: 'docker', cwd: projectDirectory ?? path, args })}`,
    );
    return this.runDocker(args, projectDirectory ?? path).then((output) => {
      this.logger.log(
        `[docker:compose] Comando completado ${JSON.stringify({ cwd: projectDirectory ?? path, composePath: dockerCompose, command })}`,
      );
      return output;
    });
  }

  private runDocker(
    command: readonly string[],
    cwd?: string,
    timeout?: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('docker', command, {
        cwd,
        shell: false,
        windowsHide: true,
        timeout,
      });

      let stderr = '';
      let stdout = '';

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        reject(new Error(`No se pudo ejecutar Docker: ${error.message}`));
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
          return;
        }

        const details = [stderr, stdout].filter(Boolean).join('\n').trim();
        reject(
          new Error(
            details
              ? `Docker termino con codigo ${code}.\n\n${details}`
              : `Docker termino con codigo ${code}.`,
          ),
        );
      });
    });
  }
}
