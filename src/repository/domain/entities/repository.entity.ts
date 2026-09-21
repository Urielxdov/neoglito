export class Repository {
  constructor(
    public readonly id: number | undefined,
    public readonly projectId: number,
    public readonly cloneUrl: string,
    public readonly sshPrivateKey: string,
    public readonly technology: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
