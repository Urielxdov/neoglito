export const REPOSITORY_CLONER = Symbol("REPOSITORY_CLONER")

export interface RepositoryClonerPort {
    clone(
        nameRepository: string,
        cloneUrl: string,
        sshPrivateKey: string,
        destination: string
    ): Promise<void>
}