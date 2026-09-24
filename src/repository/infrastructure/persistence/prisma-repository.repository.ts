import { Injectable, NotFoundException } from "@nestjs/common";
import { RepositoryRepository } from "../../domain/entities/repository.repository.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Repository } from "../../domain/entities/repository.entity.js";


@Injectable()
export class PrismaRepositoryRepository
    implements RepositoryRepository
    {
        constructor(private readonly prisma: PrismaService) {}

        async save(repository: Repository): Promise<Repository> {
            const data = repository.id === undefined
                ? await this.prisma.repository.upsert({
                    where: { cloneUrl: repository.cloneUrl },
                    create: {
                        cloneUrl: repository.cloneUrl,
                        sshPrivateKey: repository.sshPrivateKey,
                        technology: repository.technology,
                        pathSystem: repository.pathSystem,
                        createdAt: repository.createdAt,
                        updatedAt: repository.updatedAt,
                        projects: {
                            connect: repository.projectIds.map((id) => ({ id })),
                        },
                    },
                    update: {
                        projects: {
                            connect: repository.projectIds.map((id) => ({ id })),
                        },
                    },
                    include: { projects: true },
                })
                : await this.prisma.repository.update({
                    where: { id: repository.id },
                    data: {
                        cloneUrl: repository.cloneUrl,
                        sshPrivateKey: repository.sshPrivateKey,
                        technology: repository.technology,
                        pathSystem: repository.pathSystem,
                        projects: {
                            set: repository.projectIds.map((id) => ({ id })),
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
            const data = await this.prisma.repository.findUnique({
                where: {
                    cloneUrl,
                },
                include: { projects: true },
            })

            if (!data || !data.projects.some((project) => project.id === projectId)) {
                return null
            }

            return this.toDomain(data)
        }

        private toDomain(data: {
            id: number
            cloneUrl: string
            sshPrivateKey: string
            technology: string | null
            pathSystem: string | null
            createdAt: Date
            updatedAt: Date
            projects: Array<{
                id: number
            }>
        }): Repository {
            return new Repository(
                data.id,
                data.projects.map((project) => project.id),
                data.cloneUrl,
                data.sshPrivateKey,
                data.technology,
                data.pathSystem,
                data.createdAt,
                data.updatedAt,
            )
        }
    }
