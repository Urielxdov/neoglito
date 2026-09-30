export interface ProjectRepositorySummary {
    id: number
    name: string
}

export class Project {
    constructor(
        public readonly id: number | undefined,
        public readonly name: string,
        public readonly description: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly repositories: ProjectRepositorySummary[] = [],
    ){}
}
