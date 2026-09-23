export class GitHubConnection {
    constructor(
        public readonly id: number | undefined,
        public readonly userId: number,
        public readonly githubId: string,
        public readonly username: string,
        public readonly avatarUrl: string,
        public readonly accessToken: string,
        public readonly refreshToken: string | null,
        public readonly accessTokenExpiresAt: Date | null,
        public readonly refreshTokenExpiresAt: Date | null,
    ) {}
}
