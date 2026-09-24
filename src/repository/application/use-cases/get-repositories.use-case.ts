import { BadGatewayException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { ENCRYPTION_PORT } from "../../../shared/application/encryption.port.js";
import type { EncryptionPort } from "../../../shared/application/encryption.port.js";
import type { RepositoryResponse } from "@neoglito/shared/repository";
import type { GitHubRepositoryResponse } from "../../infrastructure/github/github-repository.response.js";


@Injectable()
export class GetRepositoriesUseCase{

    constructor(
        private readonly prisma: PrismaService,
        @Inject(ENCRYPTION_PORT)
        private readonly encryptionService: EncryptionPort
    ){}

    async execute(userId: number): Promise<RepositoryResponse[]> {
        const connection = await this.prisma.gitHubConnection.findUnique({
            where: {userId}
        })

        if (!connection) {
            throw new NotFoundException('El usuario no tiene una conexión de GitHub')
        }

        const accessToken = await this.encryptionService.decrypt(
            connection.accessToken
        )

        const response = await fetch('https://api.github.com/user/repos?per_page=100', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
            },
        })

        if (!response.ok) {
            throw new BadGatewayException('No fue posible obtener los repositorios de GitHub')
        }

        const repositories = await response.json() as GitHubRepositoryResponse[]

        return repositories.map((repository) => ({
            id: repository.id,
            name: repository.full_name,
            private: repository.private,
            description: repository.description ?? 'Sin descripción',
            language: repository.language ?? 'Sin lenguaje',
            gitUrl: repository.git_url,
            cloneUrl: repository.clone_url,
            updatedAt: repository.updated_at,
        }))
    }
}
