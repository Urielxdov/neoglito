export class CreateRepositoryRequest {
    constructor(
        public readonly projectId: number,
        public readonly cloneUrl: string,
        public readonly sshPrivateKey: string,
        public readonly technology: string,
    ) {}
}
