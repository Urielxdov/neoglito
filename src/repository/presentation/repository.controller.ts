import { Body, Controller, Post } from "@nestjs/common";
import { CreateRepositoryDto } from "../application/dto/create-repository.dto.js";
import { CreateRepositoryRequest } from "../application/requests/create-repository.request.js";
import { CreateRepositoryResponse } from "../application/responses/create-repository.response.js";
import { CreateRepositoryUseCase } from "../application/use-cases/create-repository.use-case.js";
import { CloneRepositoryUseCase } from "../application/use-cases/clone-repository.use-case.js";
import { CloneRepositoryDto } from "../application/dto/clone-repository.dto.js";
import type { CloneRepositoryResponse } from "@neoglito/shared";

@Controller('repository')
export class RepositoryController {
    constructor(
        private readonly createRepositoryUseCase: CreateRepositoryUseCase,
        private readonly cloneRepositoryUseCase: CloneRepositoryUseCase,
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
}
