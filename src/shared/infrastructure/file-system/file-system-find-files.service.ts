import { Injectable } from "@nestjs/common";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { FindFilesPort } from "../../application/find-files.port.js";

const IGNORED_DIRECTORIES = new Set([
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
])

@Injectable()
export class FileSystemFindFilesService implements FindFilesPort {
    async findFiles(
        rootPath: string,
        patterns: readonly string[],
    ): Promise<string[]> {
        const matches: string[] = []
        const matchers = patterns.map((pattern) => this.toMatcher(pattern))

        await this.visit(rootPath, matchers, matches)

        return matches.sort((first, second) => first.localeCompare(second))
    }

    private async visit(
        directory: string,
        matchers: RegExp[],
        matches: string[],
    ): Promise<void> {
        const entries = await readdir(directory, { withFileTypes: true })

        await Promise.all(entries.map(async (entry) => {
            const path = join(directory, entry.name)

            if (entry.isDirectory()) {
                if (!IGNORED_DIRECTORIES.has(entry.name)) {
                    await this.visit(path, matchers, matches)
                }
                return
            }

            if (entry.isFile() && matchers.some((matcher) => matcher.test(entry.name))) {
                matches.push(path)
            }
        }))
    }

    private toMatcher(pattern: string): RegExp {
        const escapedPattern = pattern.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
        const expression = escapedPattern.replace(/\*/g, ".*")

        return new RegExp(`^${expression}$`, "i")
    }
}
