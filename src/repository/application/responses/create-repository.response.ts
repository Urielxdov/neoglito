import type { CreateRepositoryResponse as CreateRepositoryResponseContract } from "@neoglito/shared";

export class CreateRepositoryResponse implements CreateRepositoryResponseContract {
    constructor(
        public readonly id: number,
        public readonly projectId: number,
        public readonly cloneUrl: string,
        public readonly technology: string | null,
        public readonly createdAt: string,
        public readonly updatedAt: string,
    ) {}
}
