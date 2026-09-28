import type { UpdateProjectRequest } from "@neoglito/shared/repository";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateProjectDto implements UpdateProjectRequest {
    @ApiProperty({ description: 'Nombre del proyecto', example: 'Eccomerce' })
    name!: string
    @ApiProperty({ description: 'Descripcion del proyecto', example: 'Tienda de articulos para tu computadora' })
    description!: string
}
