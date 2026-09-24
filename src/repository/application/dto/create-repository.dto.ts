import type { CreateRepositoryRequest } from "@neoglito/shared/repository";

export class CreateRepositoryDto implements CreateRepositoryRequest {
    projectId!: number
    id!: number
    name!: string
    gitUrl!: string
    cloneUrl!: string
}
