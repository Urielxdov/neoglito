import type { CreateRepositoryRequest } from "@neoglito/shared";

export class CreateRepositoryDto implements CreateRepositoryRequest {
    projectId!: number
    cloneUrl!: string
    sshPrivateKey!: string
    technology!: string
}
