export class User {
    constructor(
        public readonly id: number | undefined,
        public readonly name: string,
        public readonly createdAt: Date,
    ) {}
}
