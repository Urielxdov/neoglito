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
                ? await this.prisma.repository.create({
                    data: {
                        projectId: repository.projectId,
                        cloneUrl: repository.cloneUrl,
                        sshPrivateKey: repository.sshPrivateKey,
                        technology: repository.technology,
                        createdAt: repository.createdAt,
                        updatedAt: repository.updatedAt,
                    },
                })
                : await this.prisma.repository.update({
                    where: { id: repository.id },
                    data: {
                        projectId: repository.projectId,
                        cloneUrl: repository.cloneUrl,
                        sshPrivateKey: repository.sshPrivateKey,
                        technology: repository.technology,
                    },
                })

            return this.toDomain(data)
        }

        async findById(id: number): Promise<Repository> {
            const data = await this.prisma.repository.findUnique({
                where: { id },
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
                    projectId_cloneUrl: {
                        projectId,
                        cloneUrl,
                    },
                },
            })

            return data ? this.toDomain(data) : null
        }

        private toDomain(data: {
            id: number
            projectId: number
            cloneUrl: string
            sshPrivateKey: string
            technology: string
            createdAt: Date
            updatedAt: Date
        }): Repository {
            return new Repository(
                data.id,
                data.projectId,
                data.cloneUrl,
                data.sshPrivateKey,
                data.technology,
                data.createdAt,
                data.updatedAt,
            )
        }
    }
