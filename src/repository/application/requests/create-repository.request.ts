import type { CreateRepositoryRequest as CreateRepositoryRequestContract } from "@neoglito/shared/repository";

export class CreateRepositoryRequest implements CreateRepositoryRequestContract {
    constructor(
        public readonly projectId: number,
        public readonly id: number,
        public readonly name: string,
        public readonly gitUrl: string,
        public readonly cloneUrl: string,
    ) {}
}
