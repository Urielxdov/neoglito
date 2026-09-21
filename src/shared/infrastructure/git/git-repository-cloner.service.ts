import { Injectable } from "@nestjs/common";
import { RepositoryClonerPort } from "../../application/repository-cloner.port.js";
import { exec } from "child_process";
import path from "path";


@Injectable()
export class GitCloneRepositoryService implements RepositoryClonerPort {

    clone(nameRepository:string, cloneUrl: string, sshPrivateKey: string, destination: string): Promise<void> {
        const currentPath = exec('cd', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error al ejecutar: ${error.message}`);
                return;
            }

            // stdout devuelve algo como "C:\Users\Nombre\Proyecto\r\n"
            return stdout.trim();
        });

        exec(`New-Item -ItemType Directory -Path ${currentPath + path.sep + nameRepository} -Force`, (error, stdout, stderr) => {
            
        })
    }

}