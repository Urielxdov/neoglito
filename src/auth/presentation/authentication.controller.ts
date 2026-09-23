import { Controller, Get, Query, Redirect, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { ExchangeGithubCodeUseCase } from "../application/exchange_github_code.js";
import { GetGitHubUserUseCase } from "../application/get_github_user.js";
import { AuthenticateWithGitHubUseCase } from "../application/authenticate_with_github.js";
import { AuthUseCase } from "../application/auth.use-case.js";
import { JwtAuthGuard } from "../infrastructure/passport/jwt-auth.guard.js";
import type { AuthenticatedUserResponse } from "@neoglito/shared/auth";
import type { AuthenticatedRequest } from "../../shared/presentation/http/authenticated-request.js";


@Controller('auth')
export class AuthController{

    constructor(
        private readonly exchangeGithubCodeUseCase: ExchangeGithubCodeUseCase,
        private readonly getGitHubUserUseCase: GetGitHubUserUseCase,
        private readonly authenticateWithGitHubUseCase: AuthenticateWithGitHubUseCase,
        private readonly authUseCase: AuthUseCase,
    ) {}

    @Get()
    auth() {
        
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    me(@Req() request: AuthenticatedRequest): AuthenticatedUserResponse {
        return request.user
    }

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
    @Redirect()
    async githubCallback(
        @Query('code') code: string,
        @Res({ passthrough: true }) response: Response,
    ) {
        const token = await this.exchangeGithubCodeUseCase.execute(code)
        const profile = await this.getGitHubUserUseCase.execute(token.accessToken)
        const authenticatedUser = await this.authenticateWithGitHubUseCase.execute({ token, profile })
        const userId = authenticatedUser.user.id

        if (userId === undefined) {
            throw new UnauthorizedException('No fue posible autenticar al usuario')
        }

        const { accessToken } = await this.authUseCase.execute({
            id: userId,
            username: authenticatedUser.githubConnection.username,
        })

        response.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 1_000,
            path: '/',
        })

        return {
            url: process.env.FRONTEND_URL ?? 'http://localhost:5173',
            statusCode: 302,
        }
    }

}
