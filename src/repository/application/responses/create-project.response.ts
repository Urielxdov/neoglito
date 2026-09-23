import type { CreateProjectResponse as CreateProjectResponseContract } from "@neoglito/shared";

export class CreateProjectResponse implements CreateProjectResponseContract {
    constructor(
        public readonly id: number,
        public readonly name: string,
        public readonly description: string,
        public readonly createdAt: string,
        public readonly updatedAt: string,
    ) {}
}
