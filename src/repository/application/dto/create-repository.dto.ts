import type { CreateRepositoryRequest } from "@neoglito/shared/repository";
import { ApiProperty } from "@nestjs/swagger";

export class CreateRepositoryDto implements CreateRepositoryRequest {
    @ApiProperty({ description: 'Proyecto al que se asocia', example: 1 })
    projectId!: number
    @ApiProperty({ description: 'Id del repositorio que da github ', example: 235 })
    id!: number
    @ApiProperty({ description: 'Nombre del repositorio', example: 'neoglito' })
    name!: string
    @ApiProperty({ description: 'Url del repositorio de github', example: 'https://github.com/Urielxdov/neoglito' })
    gitUrl!: string
    @ApiProperty({ description: 'Url para la clonacion del repositorio mediante git', example: 'https://github.com/Urielxdov/neoglito.git' })
    cloneUrl!: string
}
