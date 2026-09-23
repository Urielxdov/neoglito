export type IsoDateString = string;
export interface CreateProjectRequest {
    name: string;
    description: string;
}
export interface CreateProjectResponse {
    id: number;
    name: string;
    description: string;
    createdAt: IsoDateString;
    updatedAt: IsoDateString;
}
export interface CreateRepositoryRequest {
    projectId: number;
    cloneUrl: string;
    sshPrivateKey: string;
    technology: string;
}
export interface CreateRepositoryResponse {
    id: number;
    projectId: number;
    cloneUrl: string;
    technology: string | null;
    createdAt: IsoDateString;
    updatedAt: IsoDateString;
}
export interface CloneRepositoryRequest {
    projectId: number;
    cloneUrl: string;
    sshPrivateKey: string;
    technology?: string;
}
export interface CloneRepositoryResponse {
    pathSystem: string;
}
