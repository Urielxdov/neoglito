import type { CloneRepositoryRequest } from "@neoglito/shared/repository";

export class CloneRepositoryDto implements CloneRepositoryRequest {
    projectId!: number
    cloneUrl!: string
    sshPrivateKey!: string
    technology?: string
}
