
export const FIND_FILES_PORT = Symbol("FIND_FILES_PORT")

export interface FindFilesPort {
    findFiles(
        rootPath: string,
        patterns: readonly string[],
    ): Promise<string[]>
}
