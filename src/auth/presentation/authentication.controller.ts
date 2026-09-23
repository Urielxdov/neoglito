import { Controller, Get, Query, Redirect } from "@nestjs/common";
import { ExchangeGithubCodeUseCase } from "../application/exchange_github_code.js";
import { GetGitHubUserUseCase } from "../application/get_github_user.js";
import { AuthenticateWithGitHubUseCase } from "../application/authenticate_with_github.js";


@Controller('auth')
export class AuthController{

    constructor(
        private readonly exchangeGithubCodeUseCase: ExchangeGithubCodeUseCase,
        private readonly getGitHubUserUseCase: GetGitHubUserUseCase,
        private readonly authenticateWithGitHubUseCase: AuthenticateWithGitHubUseCase,
    ) {}

    @Get('github')
    @Redirect()
    github(){
        const params = new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID!,
            redirect_uri: "http://localhost:3000/auth/github/callback",
            scope: "read:user user:email"
        })

        const githubUrl = `https://github.com/login/oauth/authorize?${params.toString()}`

        return { url: githubUrl, statusCode: 302 }
    }

    @Get('github/callback')
    async githubCallback(@Query('code') code: string) {
        const token = await this.exchangeGithubCodeUseCase.execute(code)
        const profile = await this.getGitHubUserUseCase.execute(token.accessToken)
        const authenticatedUser = await this.authenticateWithGitHubUseCase.execute({ token, profile })

        return {
            user: authenticatedUser.user,
            githubConnection: {
                id: authenticatedUser.githubConnection.id,
                githubId: authenticatedUser.githubConnection.githubId,
                username: authenticatedUser.githubConnection.username,
                avatarUrl: authenticatedUser.githubConnection.avatarUrl,
            },
        }
    }

}
