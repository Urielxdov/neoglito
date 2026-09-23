import type { CreateProjectRequest } from "@neoglito/shared/repository";

export class CreateProjectDto implements CreateProjectRequest {
    name!: string
    description!: string
}
