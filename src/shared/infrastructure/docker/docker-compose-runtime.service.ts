import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import type { ContainerRuntimePort } from '../../application/container-runtime.port.js';

@Injectable()
export class DockerComposeRuntime implements ContainerRuntimePort {
  up(path: string, dockerCompose: string): Promise<void> {
    return this.runDockerCompose(path, dockerCompose, ['up', '-d']);
  }

  down(path: string, dockerCompose: string): Promise<void> {
    return this.runDockerCompose(path, dockerCompose, ['down']);
  }

  delete(path: string, dockerCompose: string): Promise<void> {
    return this.runDockerCompose(path, dockerCompose, [
      'down',
      '--volumes',
      '--remove-orphans',
    ]);
  }

  private runDockerCompose(
    path: string,
    dockerCompose: string,
    command: string[],
  ): Promise<void> {
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
          resolve();
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
