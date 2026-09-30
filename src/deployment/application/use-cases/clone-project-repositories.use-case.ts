import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CloneRepositoryUseCase } from '../../../repository/application/use-cases/repository/clone-repository.use-case.js';

@Injectable()
export class CloneProjectRepositoriesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloneRepository: CloneRepositoryUseCase,
  ) {}

  async execute(userId: number, projectId: number): Promise<string[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { repositories: true },
    });

    if (!project) {
      throw new NotFoundException(
        `The project with id ${projectId} does not exist`,
      );
    }

    return Promise.all(
      project.repositories.map((repository) =>
        this.cloneRepository.execute(userId, {
          cloneUrl: repository.cloneUrl,
        }),
      ),
    );
  }
}
