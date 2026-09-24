import type { CloneRepositoryRequest } from "@neoglito/shared/repository";

export class CloneRepositoryDto implements CloneRepositoryRequest {
    cloneUrl!: string
}
