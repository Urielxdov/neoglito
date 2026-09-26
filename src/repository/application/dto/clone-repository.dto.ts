import type { CloneRepositoryRequest } from "@neoglito/shared/repository";
import { ApiProperty } from "@nestjs/swagger";

export class CloneRepositoryDto implements CloneRepositoryRequest {
    @ApiProperty({ description: 'Url para la clonacion del repositorio', example: 'https://github.com/Urielxdov/neoglito.git' })
    cloneUrl!: string
}
