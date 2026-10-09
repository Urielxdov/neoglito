import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import type {
  ComposePortAnalysis,
  ComposePortExtractPort,
} from '../../application/compose-port-extract.port.js';
import { isRecord, parseComposePort } from '../../application/compose-ports.js';

@Injectable()
export class YamlComposePortExtractService implements ComposePortExtractPort {
  async analyze(filePath: string): Promise<ComposePortAnalysis> {
    const composeFile: unknown = parse(await readFile(filePath, 'utf8'), {
      merge: true,
    });
    if (!isRecord(composeFile) || !isRecord(composeFile.services)) {
      return { ports: [] };
    }
    return {
      ports: Object.entries(composeFile.services).flatMap(
        ([service, definition]) => {
          if (!isRecord(definition) || !Array.isArray(definition.ports))
            return [];
          return definition.ports.flatMap((port: unknown) => {
            const parsed = parseComposePort(service, port);
            return parsed ? [parsed] : [];
          });
        },
      ),
    };
  }
}
