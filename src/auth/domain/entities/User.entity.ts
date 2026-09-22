export class User {
    constructor(
        public readonly id: number | undefined,
        public readonly userId: number,
        public readonly email: string,
        public readonly createdAt: Date,
    ) {}
}
