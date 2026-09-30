import { Injectable } from '@nestjs/common';
import { CloneProjectRepositoriesUseCase } from './clone-project-repositories.use-case.js';
import { InitDeployProjectUseCase } from './init-deploy-project.use-case.js';

@Injectable()
export class GetProjectComposeFilesUseCase {
  constructor(
    private readonly cloneRepositories: CloneProjectRepositoriesUseCase,
    private readonly findComposeFiles: InitDeployProjectUseCase,
  ) {}

  async execute(userId: number, projectId: number) {
    const clonedRepositoryPaths = await this.cloneRepositories.execute(userId, projectId);
    const dockerFilesPath = (await Promise.all(
      clonedRepositoryPaths.map((path) => this.findComposeFiles.execute(path)),
    )).flat();
    return { clonedRepositoryPaths, dockerFilesPath };
  }
}
