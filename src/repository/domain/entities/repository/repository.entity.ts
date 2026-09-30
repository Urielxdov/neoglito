export class Repository {
  constructor(
    public readonly id: number,
    public readonly projectIds: number[],
    public readonly name: string,
    public readonly gitUrl: string,
    public readonly cloneUrl: string,
  ) {}
}
