import { Module } from "@nestjs/common";
import { AuthController } from "./presentation/authentication.controller.js";
import { ExchangeGithubCodeUseCase } from "./application/exchange_github_code.js";
import { GetGitHubUserUseCase } from "./application/get_github_user.js";
import { AuthenticateWithGitHubUseCase } from "./application/authenticate_with_github.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ENCRYPTION_PORT } from "../shared/application/encryption.port.js";
import { Aes256GcmEncryptionService } from "../shared/infrastructure/security/aes-256-gcm-encryption.service.js";


@Module({
    controllers: [AuthController],
    providers: [
        PrismaService,
        ExchangeGithubCodeUseCase,
        GetGitHubUserUseCase,
        AuthenticateWithGitHubUseCase,
        {
            provide: ENCRYPTION_PORT,
            useClass: Aes256GcmEncryptionService,
        },
    ]
})


export class AuthModule{}
