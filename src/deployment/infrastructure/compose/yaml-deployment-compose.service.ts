import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import type {
  ComposePort,
  DeployComposeEnvironmentVariable,
} from '@neoglito/shared/repository';
import {
  isRecord,
  parseComposePort,
} from '../../../shared/application/compose-ports.js';
import {
  deploymentComposeProjectName,
  deploymentRuntimeProjectName,
  type DeploymentComposeConfiguration,
  type DeploymentComposePort,
  type PreparedDeploymentCompose,
} from '../../application/ports/deployment-compose.port.js';
import {
  configureMirroredServicePorts,
  type MirroredPort,
} from './mirror-service-ports.js';
import { CONTAINER_RUNTIME_PORT } from '../../../container/application/container-runtime.port.js';
import type { ContainerRuntimePort } from '../../../container/application/container-runtime.port.js';

const literal = (value: string) => value.replace(/\$/g, () => '$$');

@Injectable()
export class YamlDeploymentComposeService implements DeploymentComposePort {
  private readonly logger = new Logger(YamlDeploymentComposeService.name);

  constructor(
    @Inject(CONTAINER_RUNTIME_PORT)
    private readonly runtime: ContainerRuntimePort,
  ) {}

  async readSource(composePath: string, deploymentId: string) {
    if (!deploymentRuntimeProjectName(deploymentId, composePath)) {
      return {
        sourceComposePath: composePath,
        projectDirectory: dirname(composePath),
      };
    }
    const document: unknown = parse(await readFile(composePath, 'utf8'), {
      merge: true,
    });
    const metadata = isRecord(document) ? document['x-neoglito'] : undefined;
    return {
      sourceComposePath:
        isRecord(metadata) && typeof metadata.sourceComposePath === 'string'
          ? metadata.sourceComposePath
          : null,
      projectDirectory:
        isRecord(metadata) && typeof metadata.projectDirectory === 'string'
          ? metadata.projectDirectory
          : null,
    };
  }

  async prepare(
    sourcePath: string,
    deploymentId: string,
    configuration: DeploymentComposeConfiguration,
  ): Promise<PreparedDeploymentCompose> {
    let document: unknown;
    try {
      document = parse(await readFile(sourcePath, 'utf8'), { merge: true });
    } catch {
      throw new BadRequestException(
        'No se pudo leer el archivo Compose seleccionado',
      );
    }
    if (
      !isRecord(document) ||
      !isRecord(document.services) ||
      Object.keys(document.services).length === 0
    ) {
      throw new BadRequestException('El archivo Compose no declara servicios');
    }
    const services = document.services;
    for (const [name, service] of Object.entries(services)) {
      if (!isRecord(service))
        throw new BadRequestException(`Servicio Compose inválido: ${name}`);
      services[name] = { ...service };
    }
    this.applyEnvironment(services, configuration.environment ?? []);
    if (
      configuration.mirrorPorts !== undefined &&
      typeof configuration.mirrorPorts !== 'boolean'
    )
      throw new BadRequestException('mirrorPorts debe ser booleano');
    const portChanges = this.applyPorts(
      services,
      configuration.ports ?? [],
      configuration.mirrorPorts === true,
    );
    if (configuration.mirrorPorts)
      configureMirroredServicePorts(services, portChanges);
    await this.resolveBindMounts(services, dirname(resolve(sourcePath)));

    const projectName = deploymentComposeProjectName(deploymentId);
    document.name = projectName;
    document['x-neoglito'] = {
      projectDirectory: dirname(resolve(sourcePath)),
      sourceComposePath: resolve(sourcePath),
    };
    for (const [name, service] of Object.entries(services)) {
      if (isRecord(service) && service.container_name !== undefined) {
        service.container_name = `${projectName}-${name}`;
      }
    }
    for (const section of ['volumes', 'networks']) {
      const resources = document[section];
      if (!isRecord(resources)) continue;
      for (const [name, resource] of Object.entries(resources)) {
        if (
          isRecord(resource) &&
          !resource.external &&
          resource.name !== undefined
        ) {
          resources[name] = { ...resource, name: `${projectName}-${name}` };
        }
      }
    }

    const publishedPorts = this.publishedTcpPorts(services);
    const configurationDirectory = resolve(
      process.env.DEPLOYMENT_COMPOSE_DIRECTORY ?? '.neoglito/deployments',
    );
    const composePath = join(
      configurationDirectory,
      `.${projectName}.compose.yml`,
    );
    await mkdir(configurationDirectory, { recursive: true, mode: 0o700 });
    await writeFile(composePath, stringify(document), {
      flag: 'wx',
      mode: 0o600,
    });
    this.logger.log(
      `[deployment:compose] YAML configurado ${JSON.stringify({
        sourcePath,
        composePath,
        projectName,
        publishedPorts,
        environment: configuration.environment?.map(({ service, key }) => ({
          service,
          key,
        })),
      })}`,
    );
    return { composePath, projectName, publishedPorts };
  }

  private async resolveBindMounts(
    services: Record<string, unknown>,
    projectDirectory: string,
  ): Promise<void> {
    for (const service of Object.values(services)) {
      if (!isRecord(service) || !Array.isArray(service.volumes)) continue;
      service.volumes = await Promise.all(
        (service.volumes as unknown[]).map(async (volume) => {
          if (
            isRecord(volume) &&
            volume.type === 'bind' &&
            typeof volume.source === 'string'
          ) {
            return {
              ...volume,
              source: await this.runtime.resolveHostPath(
                resolve(projectDirectory, volume.source),
              ),
            };
          }
          if (typeof volume !== 'string') return volume;
          const match = /^(.+?):(\/[^:]+)(?::([^:]+))?$/.exec(volume);
          if (!match) return volume;
          const [, source, target, options] = match;
          if (!/^(?:\.|\/|[a-zA-Z]:[\\/])/.test(source)) return volume;
          const translated = await this.runtime.resolveHostPath(
            resolve(projectDirectory, source),
          );
          const readOnly = options?.split(',').includes('ro') ?? false;
          const propagation = options
            ?.split(',')
            .find((option) => /^(?:r?shared|r?slave|r?private)$/.test(option));
          const selinux = options
            ?.split(',')
            .find((option) => option === 'z' || option === 'Z');
          return {
            type: 'bind',
            source: translated,
            target,
            read_only: readOnly,
            ...(propagation || selinux
              ? {
                  bind: {
                    ...(propagation ? { propagation } : {}),
                    ...(selinux ? { selinux } : {}),
                  },
                }
              : {}),
          };
        }),
      );
    }
  }

  private applyEnvironment(
    services: Record<string, unknown>,
    variables: DeployComposeEnvironmentVariable[],
  ): void {
    if (!Array.isArray(variables))
      throw new BadRequestException('environment debe ser una lista');
    const assigned = new Set<string>();
    for (const variable of variables) {
      if (
        !isRecord(variable) ||
        typeof variable.key !== 'string' ||
        !/^[A-Za-z_][A-Za-z0-9_]*$/.test(variable.key) ||
        typeof variable.value !== 'string' ||
        variable.value.includes('\0')
      ) {
        throw new BadRequestException('Variable de entorno inválida');
      }
      if (
        variable.service !== undefined &&
        (typeof variable.service !== 'string' ||
          !Object.hasOwn(services, variable.service))
      ) {
        throw new BadRequestException(
          'La variable hace referencia a un servicio inexistente',
        );
      }
      const targets = variable.service
        ? [variable.service]
        : Object.keys(services);
      for (const name of targets) {
        const identity = `${name}:${variable.key}`;
        if (assigned.has(identity))
          throw new BadRequestException(`Variable duplicada: ${identity}`);
        assigned.add(identity);
        const service = services[name] as Record<string, unknown>;
        const environment = Object.create(null) as Record<string, unknown>;
        if (Array.isArray(service.environment)) {
          for (const entry of service.environment as unknown[]) {
            if (typeof entry !== 'string')
              throw new BadRequestException(`environment inválido en ${name}`);
            const separator = entry.indexOf('=');
            environment[separator < 0 ? entry : entry.slice(0, separator)] =
              separator < 0 ? null : entry.slice(separator + 1);
          }
        } else if (isRecord(service.environment)) {
          Object.assign(environment, service.environment);
        }
        environment[variable.key] = literal(variable.value);
        service.environment = environment;
      }
    }
  }

  private applyPorts(
    services: Record<string, unknown>,
    ports: ComposePort[],
    mirror: boolean,
  ): MirroredPort[] {
    if (!Array.isArray(ports))
      throw new BadRequestException('ports debe ser una lista');
    const assigned = new Set<string>();
    const changes: MirroredPort[] = [];
    for (const port of ports) {
      if (
        !isRecord(port) ||
        typeof port.service !== 'string' ||
        !Object.hasOwn(services, port.service) ||
        typeof port.targetPort !== 'string' ||
        !['tcp', 'udp'].includes(port.protocol) ||
        (port.publishedPort !== null && typeof port.publishedPort !== 'string')
      ) {
        throw new BadRequestException('Configuración de puerto inválida');
      }
      if (port.publishedPort !== null) this.portRange(port.publishedPort);
      const service = services[port.service] as Record<string, unknown>;
      const definitions: unknown[] = Array.isArray(service.ports)
        ? [...service.ports]
        : [];
      const index = definitions.findIndex((definition, index) => {
        const original = parseComposePort(port.service, definition);
        return (
          !assigned.has(`${port.service}:${index}`) &&
          original?.targetPort === port.targetPort &&
          original.protocol === port.protocol &&
          original.hostIp === port.hostIp
        );
      });
      if (index < 0)
        throw new BadRequestException(
          `El puerto ${port.service}:${port.targetPort}/${port.protocol} no pertenece al archivo seleccionado`,
        );
      assigned.add(`${port.service}:${index}`);
      service.ports = definitions;
      const original = definitions[index];
      const originalPort = parseComposePort(port.service, original)!;
      let targetPort = port.targetPort;
      if (mirror) {
        if (
          !port.publishedPort ||
          !/^\d+$/.test(port.publishedPort) ||
          !/^\d+$/.test(port.targetPort) ||
          port.protocol !== 'tcp'
        )
          throw new BadRequestException(
            'El modo espejo requiere un puerto TCP individual para host y contenedor',
          );
        targetPort = port.publishedPort;
        changes.push({
          service: port.service,
          previous: Number(port.targetPort),
          current: Number(targetPort),
          previousPublished:
            originalPort.publishedPort &&
            /^\d+$/.test(originalPort.publishedPort)
              ? Number(originalPort.publishedPort)
              : null,
        });
      }
      if (isRecord(original)) {
        definitions[index] = {
          ...original,
          target: mirror ? Number(targetPort) : original.target,
          published: port.publishedPort ?? undefined,
        };
      } else {
        const host = port.hostIp ? `${port.hostIp}:` : '';
        definitions[index] =
          `${port.publishedPort ? `${host}${port.publishedPort}:` : ''}${targetPort}/${port.protocol}`;
      }
    }
    return changes;
  }

  private publishedTcpPorts(services: Record<string, unknown>): number[] {
    const published = new Set<number>();
    for (const [name, service] of Object.entries(services)) {
      if (!isRecord(service) || !Array.isArray(service.ports)) continue;
      for (const definition of service.ports as unknown[]) {
        const port = parseComposePort(name, definition);
        if (!port?.publishedPort || port.protocol !== 'tcp') continue;
        for (const value of this.portRange(port.publishedPort)) {
          if (published.has(value))
            throw new BadRequestException(
              `El puerto ${value} se publica más de una vez en el despliegue`,
            );
          published.add(value);
        }
      }
    }
    return [...published];
  }

  private portRange(value: string): number[] {
    if (!/^\d+(?:-\d+)?$/.test(value))
      throw new BadRequestException(`Puerto publicado inválido: ${value}`);
    const [start, end = start] = value.split('-').map(Number);
    if (start < 1 || end > 65535 || start > end)
      throw new BadRequestException(
        `Puerto publicado fuera de rango: ${value}`,
      );
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }
}
