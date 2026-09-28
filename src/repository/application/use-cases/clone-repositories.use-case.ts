import { Injectable, NotFoundException } from "@nestjs/common";
import { CloneRepositoryUseCase } from "./clone-repository.use-case.js";
import { PrismaService } from "../../../prisma/prisma.service.js";

@Injectable()
export class CloneRepositoriesUseCase {

    constructor(
        private readonly cloneRepositoryUseCase: CloneRepositoryUseCase,
        private readonly prisma: PrismaService,
    ) {}

    async execute(userId: number, projectId: number): Promise<string[]> {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: { repositories: true },
        })

        if (!project) {
            throw new NotFoundException(`Project with id ${projectId} does not exist`)
        }

        return Promise.all(
            project.repositories.map((repository) =>
                this.cloneRepositoryUseCase.execute(userId, {
                    cloneUrl: repository.cloneUrl,
                }),
            ),
        )
    }
}
