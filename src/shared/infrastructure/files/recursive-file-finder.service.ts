import { Injectable } from '@nestjs/common';
import { readdir } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import type { FileFinderPort } from '../../application/file-finder.port.js';

@Injectable()
export class RecursiveFileFinderService implements FileFinderPort {
  async findFile(directoryPath: string, pattern: RegExp): Promise<string[]> {
    const rootDirectory = resolve(directoryPath);

    return this.findMatchingFiles(rootDirectory, rootDirectory, pattern);
  }

  private async findMatchingFiles(
    rootDirectory: string,
    currentDirectory: string,
    pattern: RegExp,
  ): Promise<string[]> {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    const matches: string[] = [];

    for (const entry of entries) {
      const entryPath = join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        matches.push(
          ...(await this.findMatchingFiles(rootDirectory, entryPath, pattern)),
        );
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const relativePath = relative(rootDirectory, entryPath)
        .split(sep)
        .join('/');

      pattern.lastIndex = 0;
      if (pattern.test(relativePath)) {
        matches.push(entryPath);
      }
    }

    return matches;
  }
}
