import { Repository } from "./repository.entity.js";

export const REPOSITORY_REPOSITORY = Symbol("REPOSITORY_REPOSITORY");

export interface RepositoryRepository {
    save(repository: Repository): Promise<Repository>
    findById(id: number): Promise<Repository>
    findByProjectIdAndCloneUrl(
        projectId: number,
        cloneUrl: string,
    ): Promise<Repository | null>
}
