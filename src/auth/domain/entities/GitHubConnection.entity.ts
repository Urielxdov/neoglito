export class GitHubConnection {
    constructor(
        public readonly id: number | undefined,
        public readonly githubUserId: string,
        public readonly accessTokenEncrypted: string,
        public readonly expiresAt: Date | null,
        public readonly scopes: string[],
    ) {}
}
