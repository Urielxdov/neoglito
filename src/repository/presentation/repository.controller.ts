import { Body, Controller, Post } from "@nestjs/common";
import { CreateRepositoryDto } from "../application/dto/create-repository.dto.js";
import { CreateRepositoryRequest } from "../application/requests/create-repository.request.js";
import { CreateRepositoryResponse } from "../application/responses/create-repository.response.js";
import { CreateRepositoryUseCase } from "../application/use-cases/create-repository.use-case.js";

@Controller('repository')
export class RepositoryController {
    constructor(
        private readonly createRepositoryUseCase: CreateRepositoryUseCase,
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
}
