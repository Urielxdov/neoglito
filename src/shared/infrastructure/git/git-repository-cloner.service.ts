import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import type { RepositoryClonerPort } from "../../application/repository-cloner.port.js";

@Injectable()
export class GitCloneRepositoryService implements RepositoryClonerPort {
    async clone(
        cloneUrl: string,
        username: string,
        accessToken: string,
        destination: string,
    ): Promise<string> {
        const temporaryDirectory = await mkdtemp(join(tmpdir(), "github-clone-"))
        const askPassPath = join(temporaryDirectory, "askpass.sh")
        const askPassScript = `#!/bin/sh
case "$1" in
  *Username*) printf '%s\\n' "$GIT_USERNAME" ;;
  *Password*) printf '%s\\n' "$GIT_PASSWORD" ;;
  *) exit 1 ;;
esac
`

        try {
            await mkdir(dirname(destination), { recursive: true })
            await writeFile(askPassPath, askPassScript, { mode: 0o700 })
            await chmod(askPassPath, 0o700)
            await this.runGitClone(cloneUrl, username, accessToken, destination, askPassPath)

            return destination
        } finally {
            await rm(temporaryDirectory, { recursive: true, force: true })
        }
    }

    private runGitClone(
        cloneUrl: string,
        username: string,
        accessToken: string,
        destination: string,
        askPassPath: string,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const git = spawn("git", ["clone", cloneUrl, destination], {
                env: {
                    ...process.env,
                    GIT_ASKPASS: askPassPath,
                    GIT_USERNAME: username,
                    GIT_PASSWORD: accessToken,
                    GIT_TERMINAL_PROMPT: "0",
                },
                stdio: ["ignore", "ignore", "pipe"],
            })

            let stderr = ""
            git.stderr.on("data", (data: Buffer) => {
                stderr += data.toString()
            })
            git.on("error", () => {
                reject(new InternalServerErrorException("No fue posible ejecutar Git"))
            })
            git.on("close", (code) => {
                if (code === 0) {
                    resolve()
                    return
                }

                reject(new InternalServerErrorException(
                    `No fue posible clonar el repositorio: ${stderr.trim()}`,
                ))
            })
        })
    }
}
