export const GIT_CLONER_PORT = Symbol("GIT_CLONER_PORT")

export interface RepositoryClonerPort {
    clone(
        cloneUrl: string,
        sshPrivateKey: string
    ): Promise<string>
}
