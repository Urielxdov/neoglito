export class CreateRepositoryResponse {
    constructor(
        public readonly id: number,
        public readonly projectId: number,
        public readonly cloneUrl: string,
        public readonly technology: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
    ) {}
}
