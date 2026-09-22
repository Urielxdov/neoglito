import { Injectable } from "@nestjs/common";
import { RepositoryClonerPort } from "../../application/repository-cloner.port.js";
import path from "path";
import * as fs from "fs"
import * as crypto from "crypto"
import * as os from "os"
import { exec } from "child_process";


@Injectable()
export class GitCloneRepositoryService implements RepositoryClonerPort {

    clone(cloneUrl: string, sshPrivateKey: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const filesystemRoot = path.parse(process.cwd()).root
            const externalPath = path.join(filesystemRoot, "repositories")

            fs.mkdirSync(externalPath, { recursive: true })

            // Creacion de ruta temporal unica en el repositorio temporal del OS
            const tempFilename = `git-key-${crypto.randomBytes(8).toString('hex')}`
            const tempKeyPath = path.join(os.tmpdir(), tempFilename)
            
            try {
                fs.writeFileSync(tempKeyPath, sshPrivateKey, { mode: 0o600 }) // Permisos estrictos de lectura/escritura durante el proceso
            } catch (err) {
                return reject(err)
            }

            // Construccion del comando SHH seguro
            // -i apunta a nuestra llave temporal
            // -o serKnownHostsFile=/dev/null evita guardar huellas en known_hosts
            // -o StrictHostKeyChecking=no evita bloqueos interactivos si el servidor es nuevo
            const sshCommand = `ssh -i "${tempKeyPath}" -o IdentitiesOnly=yes -o StrictHostKeyChecking=no`
            const gitCommand = `git clone "${cloneUrl}" "${externalPath}"`


            // Inyeccion de la variable de entorno para esta sesion de git
            exec(gitCommand, {
                env: {
                    ...process.env,
                    GIT_SSH_COMMAND: sshCommand
                }
            }, (error, stdout, stderr) => {
                try {
                    if (fs.existsSync(tempKeyPath)) {
                        fs.unlinkSync(tempKeyPath)
                    }
                } catch (cleanupError) {
                    console.error("Error al limpiar la llave temporal: ", cleanupError)
                }

                if (error) {
                    console.error(`Error al clonar el repositorio: ${error.message}`)
                    return reject(error)
                }

                console.log(`Repositorio clonado con exito en: ${externalPath} (llave temporal destruida)`)
                resolve(externalPath)
            })
        })
    }

}
