export const FILE_FINDER_PORT = Symbol('FILE_FINDER_PORT');

export interface FileFinderPort {
  findFile(directoryPath: string, pattern: RegExp): Promise<string[]>;
}
