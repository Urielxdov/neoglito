import type { ProjectRepositoryResponse, ProjectResponse as ProjectResponseContract } from "@neoglito/shared/repository";

export class ProjectResponse implements ProjectResponseContract {
    constructor(
        public readonly id: number,
        public readonly name: string,
        public readonly description: string,
        public readonly createdAt: string,
        public readonly updatedAt: string,
        public readonly repositories: ProjectRepositoryResponse[],
    ) {}
}
