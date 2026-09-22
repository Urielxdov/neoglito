export class CloneRepositoryDto {
    projectId!: number
    cloneUrl!: string
    sshPrivateKey!: string
    technology?: string
}
