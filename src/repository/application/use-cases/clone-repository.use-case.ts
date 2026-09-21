import { Inject, Injectable } from "@nestjs/common";
import { ENCRYPTION_PORT } from "../../../shared/application/encryption.port.js";
import type { EncryptionPort } from "../../../shared/application/encryption.port.js";
import { Repository } from "../../domain/entities/repository.entity.js";
import { error } from "console";
import { exec } from "child_process";
import { PROJECT_REPOSITORY, type ProjectRepository } from "../../domain/entities/project.repository.js";


@Injectable()
export class CloneRepositoryUseCase {
    constructor(
        @Inject(ENCRYPTION_PORT)
        private readonly encryptionService: EncryptionPort,
        @Inject(PROJECT_REPOSITORY)
        private readonly porjectRepository: ProjectRepository
    ) {}


    async execute (
        repository: Repository
    ): Promise<any> {
        const cloneUrl = repository.cloneUrl
        const encryptedSsh = repository.sshPrivateKey
        const decryptedSsh = this.encryptionService.decrypt(encryptedSsh)

        const project = await this.porjectRepository.findById(repository.projectId)

        if(!project) {
            return
        }

        // Solo funciona para windows de momento
        exec(`mkdir ${project.name}`, (error, stdout, stderr) => {
            exec(`cd ./${project.name}`)
            // Creacion de la carpeta para clave
            exec(`New-Item -ItemType Directory -Path ".keys" -Force`)

            // Asignarle permisos de seguridad restringidos
            exec(`icacls id_ed25519 /c /inheritance:r`)
            exec(`icacls "C:\MisProyectos\.keys\id_ed25519" /grant:r "$($env:USERNAME):F"`)

            // Agregar la clave privada al archivo
            exec(`copy .keys\id_ed25519 ${decryptedSsh}`)

            exec(`git clone ${cloneUrl}`)
        })
        
    }
}