import {
  Controller,
  Get,
  Query,
  Redirect,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExchangeGithubCodeUseCase } from '../application/exchange_github_code.js';
import { GetGitHubUserUseCase } from '../application/get_github_user.js';
import { AuthenticateWithGitHubUseCase } from '../application/authenticate_with_github.js';
import { AuthUseCase } from '../application/auth.use-case.js';
import { JwtAuthGuard } from '../infrastructure/passport/jwt-auth.guard.js';
import type { AuthenticatedUserResponse } from '@neoglito/shared/auth';
import type { AuthenticatedRequest } from '../../shared/presentation/http/authenticated-request.js';
import {
  getGitHubCallbackUrl,
  getGitHubClientId,
} from '../application/github-oauth.config.js';
import { getSchemaPath, ApiBearerAuth, ApiFoundResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import {
  ApiSuccessResponseDoc,
  AuthenticatedUserSchema,
} from '../../shared/presentation/swagger/api-response.schemas.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly exchangeGithubCodeUseCase: ExchangeGithubCodeUseCase,
    private readonly getGitHubUserUseCase: GetGitHubUserUseCase,
    private readonly authenticateWithGitHubUseCase: AuthenticateWithGitHubUseCase,
    private readonly authUseCase: AuthUseCase,
  ) { }


  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna el nombre de usuario del usuario autenticado' })
  @ApiSuccessResponseDoc({
    status: 200,
    description: 'Usuario autenticado',
    dataSchema: { $ref: getSchemaPath(AuthenticatedUserSchema) },
    extraModels: [AuthenticatedUserSchema],
  })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  me(@Req() request: AuthenticatedRequest): AuthenticatedUserResponse {
    return request.user;
  }

  @Get('github')
  @Redirect()
  @ApiOperation({ summary: 'Redirige al OAuth de github' })
  @ApiFoundResponse({
    description: 'Redireccion a Github OAuth',
    headers: {
      Location: {
        description: 'URL de autorizacion de GitHub',
        schema: { type: 'string', format: 'uri' },
      },
    },
  })
  github() {
    const params = new URLSearchParams({
      client_id: getGitHubClientId(),
      redirect_uri: getGitHubCallbackUrl(),
      scope: 'read:user user:email',
    });

    const githubUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return { url: githubUrl, statusCode: 302 };
  }

  @Get('github/callback')
  @Redirect()
  @ApiOperation({ summary: 'Callback OAuth de Github' })
  @ApiQuery({ name: 'code', required: true })
  @ApiFoundResponse({
    description: 'Redireccion al frontend con cookie de sesion',
    headers: {
      Location: {
        description: 'URL del frontend',
        schema: { type: 'string', format: 'uri' },
      },
      'Set-Cookie': {
        description: 'Cookie de sesion HttpOnly',
        schema: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'No fue posible realizar la autorizacion del usuario' })
  async githubCallback(
    @Query('code') code: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = await this.exchangeGithubCodeUseCase.execute(code);
    const profile = await this.getGitHubUserUseCase.execute(token.accessToken);
    const authenticatedUser = await this.authenticateWithGitHubUseCase.execute({
      token,
      profile,
    });
    const userId = authenticatedUser.user.id;

    if (userId === undefined) {
      throw new UnauthorizedException('No fue posible autenticar al usuario');
    }

    const { accessToken } = await this.authUseCase.execute({
      id: userId,
      username: authenticatedUser.githubConnection.username,
    });

    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1_000,
      path: '/',
    });

    return {
      url: process.env.FRONTEND_URL ?? 'http://localhost:5173',
      statusCode: 302,
    };
  }
}
