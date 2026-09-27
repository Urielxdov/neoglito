import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import type { ContainerRuntimePort, ContainerRuntimeService } from '../../application/container-runtime.port.js';

@Injectable()
export class DockerComposeRuntime implements ContainerRuntimePort {
  private readonly logger = new Logger(DockerComposeRuntime.name)
  async up(path: string, dockerCompose: string): Promise<void> {
    await this.runDockerCompose(path, dockerCompose, ['up', '--build', '-d']);
  }

  async list(path: string, dockerCompose: string): Promise<ContainerRuntimeService[]> {
    const output = await this.runDockerCompose(path, dockerCompose, ['ps', '--all', '--format', 'json']);
    let entries: unknown[];
    try {
      const parsed: unknown = JSON.parse(output);
      entries = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      entries = output.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as unknown);
    }
    return entries.map((entry) => {
      const item = entry as Record<string, unknown>;
      const asText = (value: unknown, fallback: string) => typeof value === 'string' ? value : fallback;
      const rawStatus = asText(item.State, 'created').toLowerCase();
      const rawHealth = asText(item.Health, 'none').toLowerCase();
      const status = ['created', 'running', 'paused', 'restarting', 'exited', 'dead'].includes(rawStatus)
        ? rawStatus
        : 'created';
      const health = ['starting', 'healthy', 'unhealthy', 'none'].includes(rawHealth)
        ? rawHealth
        : 'none';
      return {
        containerId: asText(item.ID ?? item.Id, ''),
        composeServiceName: asText(item.Service, ''),
        status: status as ContainerRuntimeService['status'],
        health: health as ContainerRuntimeService['health'],
      };
    }).filter((item) => item.containerId);
  }

  async down(path: string, dockerCompose: string): Promise<void> {
    await this.runDockerCompose(path, dockerCompose, ['down']);
  }

  async delete(path: string, dockerCompose: string): Promise<void> {
    await this.runDockerCompose(path, dockerCompose, [
      'down',
      '--volumes',
      '--remove-orphans',
    ]);
  }

  private runDockerCompose(
    path: string,
    dockerCompose: string,
    command: string[],
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('docker', ['compose', '-f', dockerCompose, ...command], {
        cwd: path,
        shell: process.platform === 'win32',
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
        reject(new Error(`No se pudo ejecutar Docker Compose: ${error.message}`));
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
              ? `Docker Compose termino con codigo ${code}.\n\n${details}`
              : `Docker Compose termino con codigo ${code}.`,
          ),
        );
      });
    });
  }
}
