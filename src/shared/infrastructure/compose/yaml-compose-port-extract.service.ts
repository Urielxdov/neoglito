import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

type YamlRecord = Record<string, unknown>;

export interface ComposePort {
  service: string;
  hostIp: string | null;
  publishedPort: string | null;
  targetPort: string;
  protocol: string;
  mappingType: 'one-to-one' | 'range';
}

export interface ComposePortAnalysis {
  ports: ComposePort[];
}

@Injectable()
export class YamlComposePortExtractService {
  async analyze(filePath: string): Promise<ComposePortAnalysis> {
    const fileContent = await readFile(filePath, 'utf8');
    const composeFile = parse(fileContent) as unknown;

    return { ports: this.extractPorts(composeFile) };
  }

  private extractPorts(composeFile: unknown): ComposePort[] {
    if (!this.isRecord(composeFile) || !this.isRecord(composeFile.services)) {
      return [];
    }

    return Object.entries(composeFile.services).flatMap(
      ([service, definition]) => {
        if (!this.isRecord(definition) || !Array.isArray(definition.ports)) {
          return [];
        }

        return definition.ports.flatMap((port) =>
          this.parsePort(service, port),
        );
      },
    );
  }

  private parsePort(service: string, port: unknown): ComposePort[] {
    if (typeof port === 'string' || typeof port === 'number') {
      return this.parseShortSyntax(service, String(port));
    }

    if (!this.isRecord(port) || port.target === undefined) {
      return [];
    }

    const targetPort = String(port.target);
    const publishedPort =
      port.published == null ? null : String(port.published);
    const hostIp = typeof port.host_ip === 'string' ? port.host_ip : null;
    const protocol = typeof port.protocol === 'string' ? port.protocol : 'tcp';

    return [
      {
        service,
        hostIp,
        publishedPort,
        targetPort,
        protocol,
        mappingType:
          this.isRange(publishedPort) || this.isRange(targetPort)
            ? 'range'
            : 'one-to-one',
      },
    ];
  }

  private parseShortSyntax(service: string, value: string): ComposePort[] {
    const [mapping, protocol = 'tcp'] = value.split('/');
    const parts = mapping.split(':');
    let hostIp: string | null = null;
    let publishedPort: string | null = null;
    let targetPort: string;

    if (parts.length === 1) {
      targetPort = parts[0];
    } else if (parts.length === 2) {
      [publishedPort, targetPort] = parts;
    } else {
      hostIp = parts.slice(0, -2).join(':') || null;
      [publishedPort, targetPort] = parts.slice(-2);
    }

    if (!targetPort) {
      return [];
    }

    return [
      {
        service,
        hostIp,
        publishedPort: publishedPort || null,
        targetPort,
        protocol,
        mappingType:
          this.isRange(publishedPort) || this.isRange(targetPort)
            ? 'range'
            : 'one-to-one',
      },
    ];
  }

  private isRange(port: string | null): boolean {
    return port !== null && /^\d+-\d+$/.test(port);
  }

  private isRecord(value: unknown): value is YamlRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
