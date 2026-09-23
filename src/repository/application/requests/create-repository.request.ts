import type { CreateRepositoryRequest as CreateRepositoryRequestContract } from "@neoglito/shared";

export class CreateRepositoryRequest implements CreateRepositoryRequestContract {
    constructor(
        public readonly projectId: number,
        public readonly cloneUrl: string,
        public readonly sshPrivateKey: string,
        public readonly technology: string,
    ) {}
}
