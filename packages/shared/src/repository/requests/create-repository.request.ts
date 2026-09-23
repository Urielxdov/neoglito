export interface CreateRepositoryRequest {
  projectId: number
  cloneUrl: string
  sshPrivateKey: string
  technology: string
}
