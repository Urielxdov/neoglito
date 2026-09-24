import type { CreateRepositoryResponse as CreateRepositoryResponseContract } from "@neoglito/shared/repository";

export class CreateRepositoryResponse implements CreateRepositoryResponseContract {
    constructor(
        public readonly id: number,
        public readonly projectId: number,
        public readonly name: string,
        public readonly gitUrl: string,
        public readonly cloneUrl: string,
    ) {}
}
