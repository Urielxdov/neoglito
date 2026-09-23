import { BadGatewayException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { ENCRYPTION_PORT } from "../../../shared/application/encryption.port.js";
import type { EncryptionPort } from "../../../shared/application/encryption.port.js";


@Injectable()
export class GetRepositoriesUseCase{

    constructor(
        private readonly prisma: PrismaService,
        @Inject(ENCRYPTION_PORT)
        private readonly encryptionService: EncryptionPort
    ){}

    async execute(userId: number) {
        const connection = await this.prisma.gitHubConnection.findUnique({
            where: {userId}
        })

        if (!connection) {
            throw new NotFoundException('El usuario no tiene una conexión de GitHub')
        }

        const accessToken = await this.encryptionService.decrypt(
            connection.accessToken
        )

        const repositories = await fetch('https://api.github.com/user/repos?per_page=100', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
            },
        })


        if (!repositories.ok) {
            throw new BadGatewayException('No fue posible obtener los repositorios de GitHub')
        }

        return repositories.json()
    }
}