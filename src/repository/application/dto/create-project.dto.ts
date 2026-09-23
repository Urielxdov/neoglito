import type { CreateProjectRequest } from "@neoglito/shared";

export class CreateProjectDto implements CreateProjectRequest {
    name!: string
    description!: string
}
