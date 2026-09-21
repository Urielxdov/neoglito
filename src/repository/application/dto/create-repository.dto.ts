export class CreateRepositoryDto {
    projectId!: number
    cloneUrl!: string
    sshPrivateKey!: string
    technology!: string
}
