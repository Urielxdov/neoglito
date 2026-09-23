import { BadGatewayException, Injectable } from "@nestjs/common";

interface GitHubUserResponse {
    id: number
    login: string
    name: string | null
    avatar_url: string
}

export interface GitHubUserProfile {
    name: string
    githubId: string
    username: string
    avatarUrl: string
}

@Injectable()
export class GetGitHubUserUseCase {
    private readonly githubUserUri = 'https://api.github.com/user'

    async execute(accessToken: string): Promise<GitHubUserProfile> {
        const response = await fetch(this.githubUserUri, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
            },
        })

        if (!response.ok) {
            throw new BadGatewayException('No fue posible obtener el perfil de GitHub')
        }

        const userResponse = await response.json() as GitHubUserResponse

        return {
            name: userResponse.name ?? userResponse.login,
            githubId: String(userResponse.id),
            username: userResponse.login,
            avatarUrl: userResponse.avatar_url,
        }
    }
}
