export class Project {
    constructor(
        public readonly id: number | undefined,
        public readonly name: string,
        public readonly description: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
    ){}
}
