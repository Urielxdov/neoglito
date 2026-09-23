import type { CreateProjectRequest as CreateProjectRequestContract } from "@neoglito/shared";

export class CreateProjectRequest implements CreateProjectRequestContract {
    constructor(
        public readonly name: string,
        public readonly description: string,
    ) {}
}
