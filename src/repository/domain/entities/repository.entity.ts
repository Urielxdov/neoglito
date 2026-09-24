export class Repository {
  constructor(
    public readonly id: number | undefined,
    public readonly projectIds: number[],
    public readonly cloneUrl: string,
    public readonly sshPrivateKey: string,
    public readonly technology: string | null,
    public readonly pathSystem: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
