import type { CreateProjectRequest } from "@neoglito/shared/repository";
import { ApiProperty } from "@nestjs/swagger";

export class CreateProjectDto implements CreateProjectRequest {
    @ApiProperty({ description: 'Nombre del proyecto', example: 'Eccomerce' })
    name!: string
    @ApiProperty({ description: 'Descripcion del proyecto', example: 'Tienda de articulos para tu computadora' })
    description!: string
}
