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


@Controller('repository')
export class RepositoryController {
    constructor(
        private readonly createRepositoryUseCase: CreateRepositoryUseCase,
        private readonly cloneRepositoryUseCase: CloneRepositoryUseCase,
        private readonly getRepositories: GetRepositoriesUseCase
    ) {}

    @Post('registry')
    async registryRepository(
        @Body() dto: CreateRepositoryDto,
    ): Promise<CreateRepositoryResponse> {
        return this.createRepositoryUseCase.execute(
            new CreateRepositoryRequest(
                dto.projectId,
                dto.cloneUrl,
                dto.sshPrivateKey,
                dto.technology,
            ),
        )
    }

    @Post('clone')
    async cloneRepository(@Body() dto: CloneRepositoryDto): Promise<CloneRepositoryResponse> {
        const pathSystem = await this.cloneRepositoryUseCase.execute(dto)
        return { pathSystem }
    }

    @Get('all')
    @UseGuards(JwtAuthGuard)
    async all(@Req() request: AuthenticatedRequest) {
        return await this.getRepositories.execute(request.user.id)
    }
}
