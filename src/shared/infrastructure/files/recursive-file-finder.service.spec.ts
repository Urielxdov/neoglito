import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { RecursiveFileFinderService } from './recursive-file-finder.service.js';

describe('RecursiveFileFinderService', () => {
  let temporaryDirectory: string;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'file-finder-'));
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('finds files recursively by relative path', async () => {
    const service = new RecursiveFileFinderService();
    const nestedDirectory = join(temporaryDirectory, 'src', 'application');
    await mkdir(nestedDirectory, { recursive: true });
    await writeFile(join(temporaryDirectory, 'README.md'), '');
    await writeFile(join(nestedDirectory, 'file-finder.port.ts'), '');
    await writeFile(join(nestedDirectory, 'other-file.ts'), '');

    const files = await service.findFile(
      temporaryDirectory,
      /application\/.*\.port\.ts$/,
    );

    expect(files.map((file) => basename(file))).toEqual([
      'file-finder.port.ts',
    ]);
  });

  it('resets stateful regular expressions between files', async () => {
    const service = new RecursiveFileFinderService();
    await writeFile(join(temporaryDirectory, 'first.ts'), '');
    await writeFile(join(temporaryDirectory, 'second.ts'), '');

    const files = await service.findFile(temporaryDirectory, /\.ts$/g);

    expect(files).toHaveLength(2);
  });
});
