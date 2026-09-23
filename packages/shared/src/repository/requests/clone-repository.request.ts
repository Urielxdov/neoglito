export interface CloneRepositoryRequest {
  projectId: number
  cloneUrl: string
  sshPrivateKey: string
  technology?: string
}
