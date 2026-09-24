import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Project } from "../../domain/entities/project.entity.js";
import { ProjectRepository } from "../../domain/entities/project.repository.js";

@Injectable()
export class PrismaProjectRepository implements ProjectRepository {
    constructor(private readonly prisma: PrismaService) {}

    async save(project: Project): Promise<Project> {
        const data = project.id === undefined
            ? await this.prisma.project.create({
                data: {
                    name: project.name,
                    description: project.description,
                    createdAt: project.createdAt,
                    updatedAt: project.updatedAt,
                },
            })
            : await this.prisma.project.update({
                where: { id: project.id },
                data: {
                    name: project.name,
                    description: project.description,
                },
            })

        return this.toDomain(data)
    }

    async findById(id: number): Promise<Project> {
        const data = await this.prisma.project.findUnique({
            where: { id },
        })

        if (!data) {
            throw new NotFoundException(`Project with id ${id} does not exist`)
        }

        return this.toDomain(data)
    }

    async findByName(name: string): Promise<Project | null> {
        const data = await this.prisma.project.findUnique({
            where: { name },
        })

        return data ? this.toDomain(data) : null
    }

    async findAll(): Promise<Project[]> {
        const data = await this.prisma.project.findMany({
            include: { repositories: true },
            orderBy: { updatedAt: 'desc' },
        })

        return data.map((project) => this.toDomain(project))
    }

    private toDomain(data: {
        id: number
        name: string
        description: string
        createdAt: Date
        updatedAt: Date
        repositories?: Array<{ id: number; name: string }>
    }): Project {
        return new Project(
            data.id,
            data.name,
            data.description,
            data.createdAt,
            data.updatedAt,
            data.repositories?.map((repository) => ({ id: repository.id, name: repository.name })) ?? [],
        )
    }
}
