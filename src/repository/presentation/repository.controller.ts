import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { CreateRepositoryDto } from "../application/dto/create-repository.dto.js";
import { CreateRepositoryRequest } from "../application/requests/create-repository.request.js";
import { CreateRepositoryResponse } from "../application/responses/create-repository.response.js";
import { CreateRepositoryUseCase } from "../application/use-cases/create-repository.use-case.js";
import { CloneRepositoryUseCase } from "../application/use-cases/clone-repository.use-case.js";
import { CloneRepositoryDto } from "../application/dto/clone-repository.dto.js";
import type { CloneRepositoryResponse } from "@neoglito/shared/repository";
import { JwtAuthGuard } from "../../auth/infrastructure/passport/jwt-auth.guard.js";
import type { AuthenticatedRequest } from "../../shared/presentation/http/authenticated-request.js";
import { GetRepositoriesUseCase } from "../application/use-cases/get-repositories.use-case.js";
import { getSchemaPath, ApiBearerAuth, ApiBody, ApiOperation, ApiUnauthorizedResponse } from "@nestjs/swagger";
import {
    ApiSuccessResponseDoc,
    CloneRepositoryDataSchema,
    CreateRepositoryDataSchema,
    GitHubRepositorySchema,
} from "../../shared/presentation/swagger/api-response.schemas.js";


@Controller('repository')
export class RepositoryController {
    constructor(
        private readonly createRepositoryUseCase: CreateRepositoryUseCase,
        private readonly cloneRepositoryUseCase: CloneRepositoryUseCase,
        private readonly getRepositories: GetRepositoriesUseCase
    ) { }

    @Post('registry')
    @ApiOperation({ description: 'Se guarda la informacion relevante de un repositorio' })
    @ApiBody({ type: CreateRepositoryDto })
    @ApiSuccessResponseDoc({
        status: 201,
        description: 'Informacion del repositorio guardada correctamente',
        dataSchema: { $ref: getSchemaPath(CreateRepositoryDataSchema) },
        extraModels: [CreateRepositoryDataSchema],
    })
    async registryRepository(
        @Body() dto: CreateRepositoryDto,
    ): Promise<CreateRepositoryResponse> {
        return this.createRepositoryUseCase.execute(
            new CreateRepositoryRequest(
                dto.projectId,
                dto.id,
                dto.name,
                dto.gitUrl,
                dto.cloneUrl,
            ),
        )
    }

    @Post('clone')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ description: 'Clona el repositorio en el backend' })
    @ApiBody({ type: CloneRepositoryDto })
    @ApiSuccessResponseDoc({
        status: 201,
        description: 'Repositorio clonado correctamente',
        dataSchema: { $ref: getSchemaPath(CloneRepositoryDataSchema) },
        extraModels: [CloneRepositoryDataSchema],
    })
    @ApiUnauthorizedResponse({ description: 'Usuario no autenticado' })
    @ApiBearerAuth()
    async cloneRepository(
        @Req() request: AuthenticatedRequest,
        @Body() dto: CloneRepositoryDto,
    ): Promise<CloneRepositoryResponse> {
        const pathSystem = await this.cloneRepositoryUseCase.execute(request.user.id, dto)
        return { pathSystem }
    }

    @Get('all')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ description: 'Obtiene todos los repositorios asociados a un usuario autenticado' })
    @ApiSuccessResponseDoc({
        status: 200,
        description: 'Repositorios asociados al usuario autenticado',
        dataSchema: { type: 'array', items: { $ref: getSchemaPath(GitHubRepositorySchema) } },
        extraModels: [GitHubRepositorySchema],
    })
    @ApiUnauthorizedResponse({ description: 'Usuario no autenticado' })
    @ApiBearerAuth()
    async all(@Req() request: AuthenticatedRequest) {
        return await this.getRepositories.execute(request.user.id)
    }
}
