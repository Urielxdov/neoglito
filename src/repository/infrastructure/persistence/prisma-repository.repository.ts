import { Injectable, NotFoundException } from "@nestjs/common";
import type { RepositoryRepository } from "../../domain/entities/repository.repository.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Repository } from "../../domain/entities/repository.entity.js";

@Injectable()
export class PrismaRepositoryRepository implements RepositoryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async save(repository: Repository): Promise<Repository> {
        const data = await this.prisma.repository.upsert({
            where: { id: repository.id },
            create: {
                id: repository.id,
                name: repository.name,
                gitUrl: repository.gitUrl,
                cloneUrl: repository.cloneUrl,
                projects: {
                    connect: repository.projectIds.map((id) => ({ id })),
                },
            },
            update: {
                name: repository.name,
                gitUrl: repository.gitUrl,
                cloneUrl: repository.cloneUrl,
                projects: {
                    connect: repository.projectIds.map((id) => ({ id })),
                },
            },
            include: { projects: true },
        })

        return this.toDomain(data)
    }

    async findById(id: number): Promise<Repository> {
        const data = await this.prisma.repository.findUnique({
            where: { id },
            include: { projects: true },
        })

        if (!data) {
            throw new NotFoundException(`Repository with id ${id} does not exist`)
        }

        return this.toDomain(data)
    }

    async findByProjectIdAndCloneUrl(
        projectId: number,
        cloneUrl: string,
    ): Promise<Repository | null> {
        const data = await this.prisma.repository.findFirst({
            where: {
                cloneUrl,
                projects: {
                    some: { id: projectId },
                },
            },
            include: { projects: true },
        })

        return data ? this.toDomain(data) : null
    }

    private toDomain(data: {
        id: number
        name: string
        gitUrl: string
        cloneUrl: string
        projects: Array<{ id: number }>
    }): Repository {
        return new Repository(
            data.id,
            data.projects.map((project) => project.id),
            data.name,
            data.gitUrl,
            data.cloneUrl,
        )
    }
}
