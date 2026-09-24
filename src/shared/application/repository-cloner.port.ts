export const GIT_CLONER_PORT = Symbol("GIT_CLONER_PORT")

export interface RepositoryClonerPort {
    clone(
        cloneUrl: string,
        username: string,
        accessToken: string,
        destination: string,
    ): Promise<string>
}
