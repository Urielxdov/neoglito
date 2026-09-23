import type { CreateRepositoryRequest as CreateRepositoryRequestContract } from "@neoglito/shared/repository";

export class CreateRepositoryRequest implements CreateRepositoryRequestContract {
    constructor(
        public readonly projectId: number,
        public readonly cloneUrl: string,
        public readonly sshPrivateKey: string,
        public readonly technology: string,
    ) {}
}
