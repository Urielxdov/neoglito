import { Module } from "@nestjs/common";
import { AuthController } from "./presentation/authentication.controller.js";
import { ExchangeGithubCodeUseCase } from "./application/exchange_github_code.js";
import { GetGitHubUserUseCase } from "./application/get_github_user.js";
import { AuthenticateWithGitHubUseCase } from "./application/authenticate_with_github.js";
import { AuthUseCase } from "./application/auth.use-case.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ENCRYPTION_PORT } from "../shared/application/encryption.port.js";
import { Aes256GcmEncryptionService } from "../shared/infrastructure/security/aes-256-gcm-encryption.service.js";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./infrastructure/passport/jwt.strategy.js";
import { JwtAuthGuard } from "./infrastructure/passport/jwt-auth.guard.js";


@Module({
    imports: [
        PassportModule.register({ session: false }),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: {
                expiresIn: '1h'
            }
        })
    ],
    controllers: [AuthController],
    providers: [
        PrismaService,
        ExchangeGithubCodeUseCase,
        GetGitHubUserUseCase,
        AuthenticateWithGitHubUseCase,
        AuthUseCase,
        JwtStrategy,
        JwtAuthGuard,
        {
            provide: ENCRYPTION_PORT,
            useClass: Aes256GcmEncryptionService,
        },
    ],
    exports: [JwtModule, JwtAuthGuard]
})


export class AuthModule{}
