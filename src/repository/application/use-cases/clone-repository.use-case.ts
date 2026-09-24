import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { access } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { ENCRYPTION_PORT } from "../../../shared/application/encryption.port.js";
import type { EncryptionPort } from "../../../shared/application/encryption.port.js";
import { GIT_CLONER_PORT } from "../../../shared/application/repository-cloner.port.js";
import type { RepositoryClonerPort } from "../../../shared/application/repository-cloner.port.js";
import { CloneRepositoryDto } from "../dto/clone-repository.dto.js";

@Injectable()
export class CloneRepositoryUseCase {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(ENCRYPTION_PORT)
        private readonly encryptionService: EncryptionPort,
        @Inject(GIT_CLONER_PORT)
        private readonly repositoryCloner: RepositoryClonerPort,
    ) {}

    async execute(userId: number, request: CloneRepositoryDto): Promise<string> {
        const repositoryName = this.getRepositoryName(request.cloneUrl)
        const connection = await this.prisma.gitHubConnection.findUnique({
            where: { userId },
        })

        if (!connection) {
            throw new NotFoundException("El usuario no tiene una conexión de GitHub")
        }

        const username = connection.username
        const destination = this.getDestination(username, repositoryName)

        if (await this.exists(destination)) {
            throw new ConflictException("El repositorio ya fue clonado para este usuario")
        }

        const accessToken = await this.encryptionService.decrypt(connection.accessToken)

        return this.repositoryCloner.clone(
            request.cloneUrl,
            username,
            accessToken,
            destination,
        )
    }

    private getRepositoryName(cloneUrl: string): string {
        try {
            const url = new URL(cloneUrl)
            const repositoryName = url.pathname.split("/").filter(Boolean).at(-1)?.replace(/\.git$/, "")

            if (
                url.protocol !== "https:"
                || url.hostname !== "github.com"
                || !repositoryName
                || !/^[a-zA-Z0-9._-]+$/.test(repositoryName)
            ) {
                throw new Error()
            }

            return repositoryName
        } catch {
            throw new BadRequestException("cloneUrl debe ser una URL HTTPS válida de GitHub")
        }
    }

    private getDestination(username: string, repositoryName: string): string {
        if (!/^[a-zA-Z0-9-]+$/.test(username)) {
            throw new BadRequestException("El username de GitHub no es válido")
        }

        const repositoriesRoot = resolve(process.cwd(), "repo")
        const destination = resolve(repositoriesRoot, username, repositoryName)

        if (relative(repositoriesRoot, destination).startsWith("..")) {
            throw new BadRequestException("La ruta de destino no es válida")
        }

        return destination
    }

    private async exists(path: string): Promise<boolean> {
        try {
            await access(path)
            return true
        } catch {
            return false
        }
    }
}
