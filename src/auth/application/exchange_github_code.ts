import { Injectable } from "@nestjs/common";

interface GitHubAccessTokenResponse {
    access_token: string
    expires_in?: number
    refresh_token?: string
    refresh_token_expires_in?: number
    token_type: string
    scope: string
}

export interface GitHubAccessToken {
    accessToken: string
    expiresIn?: number
    refreshToken?: string
    refreshTokenExpiresIn?: number
    tokenType: string
    scope: string
}

@Injectable()
export class ExchangeGithubCodeUseCase {
    githubAccessTokenUri: string

    constructor() {
        this.githubAccessTokenUri = 'https://github.com/login/oauth/access_token'
    }

    async execute(code: string): Promise<GitHubAccessToken> {
        const responseToken = await fetch(this.githubAccessTokenUri,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code,
                    redirect_uri: "http://localhost:3000/auth/github/callback",
                })
            }
        )

        const data = await responseToken.json() as GitHubAccessTokenResponse

        return {
            accessToken: data.access_token,
            expiresIn: data.expires_in,
            refreshToken: data.refresh_token,
            refreshTokenExpiresIn: data.refresh_token_expires_in,
            tokenType: data.token_type,
            scope: data.scope,
        }
    }
}
