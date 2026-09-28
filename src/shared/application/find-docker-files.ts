import { Inject, Injectable } from "@nestjs/common";
import { relative } from "node:path";
import { FIND_FILES_PORT } from "./find-files.port.js";
import type { FindFilesPort } from "./find-files.port.js";

const DOCKER_FILE_PATTERNS = [
    "Dockerfile",
    "Dockerfile.*",
    "docker-compose.yml",
    "docker-compose.yaml",
    "docker-compose.*.yml",
    "docker-compose.*.yaml",
    "compose.yml",
    "compose.yaml",
] as const

@Injectable()
export class FindDockerFilesUseCase {
    constructor(
        @Inject(FIND_FILES_PORT)
        private readonly findFiles: FindFilesPort,
    ) {}

    async execute(repositoryPath: string): Promise<string[]> {
        const files = await this.findFiles.findFiles(
            repositoryPath,
            DOCKER_FILE_PATTERNS,
        )

        return files.map((file) => relative(repositoryPath, file))
    }
}
