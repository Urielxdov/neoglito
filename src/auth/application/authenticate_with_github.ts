import { Inject, Injectable } from "@nestjs/common";
import { GitHubConnection } from "../domain/entities/GitHubConnection.entity.js";
import { User } from "../domain/entities/User.entity.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { ENCRYPTION_PORT } from "../../shared/application/encryption.port.js";
import type { EncryptionPort } from "../../shared/application/encryption.port.js";
import { GitHubAccessToken } from "./exchange_github_code.js";
import { GitHubUserProfile } from "./get_github_user.js";

interface AuthenticateWithGitHubInput {
    token: GitHubAccessToken
    profile: GitHubUserProfile
}

interface AuthenticatedGitHubUser {
    user: User
    githubConnection: GitHubConnection
}

@Injectable()
export class AuthenticateWithGitHubUseCase {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(ENCRYPTION_PORT)
        private readonly encryptionService: EncryptionPort,
    ) {}

    async execute({ token, profile }: AuthenticateWithGitHubInput): Promise<AuthenticatedGitHubUser> {
        const accessToken = await this.encryptionService.encrypt(token.accessToken)
        const refreshToken = token.refreshToken
            ? await this.encryptionService.encrypt(token.refreshToken)
            : undefined
        const accessTokenExpiresAt = this.toExpirationDate(token.expiresIn)
        const refreshTokenExpiresAt = this.toExpirationDate(token.refreshTokenExpiresIn)

        const connection = await this.prisma.gitHubConnection.upsert({
            where: { githubId: profile.githubId },
            create: {
                githubId: profile.githubId,
                username: profile.username,
                avatarUrl: profile.avatarUrl,
                accessToken,
                refreshToken: refreshToken ?? null,
                accessTokenExpiresAt,
                refreshTokenExpiresAt,
                user: {
                    create: { name: profile.name },
                },
            },
            update: {
                username: profile.username,
                avatarUrl: profile.avatarUrl,
                accessToken,
                accessTokenExpiresAt,
                ...(refreshToken && { refreshToken }),
                ...(token.refreshTokenExpiresIn !== undefined && { refreshTokenExpiresAt }),
                user: {
                    update: { name: profile.name },
                },
            },
            include: { user: true },
        })

        return {
            user: new User(connection.user.id, connection.user.name, connection.user.createdAt),
            githubConnection: new GitHubConnection(
                connection.id,
                connection.userId,
                connection.githubId,
                connection.username,
                connection.avatarUrl,
                token.accessToken,
                token.refreshToken ?? null,
                connection.accessTokenExpiresAt,
                connection.refreshTokenExpiresAt,
            ),
        }
    }

    private toExpirationDate(expiresIn: number | undefined): Date | null {
        return expiresIn === undefined ? null : new Date(Date.now() + expiresIn * 1_000)
    }
}
