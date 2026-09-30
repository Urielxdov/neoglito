import { Project } from "./project.entity.js";

export const PROJECT_REPOSITORY = Symbol("PROJECT_REPOSITORY");

export interface ProjectRepository {
    save(project: Project):Promise<Project>
    findById(id: number):Promise<Project>
    findByName(name: string): Promise<Project | null>
    findAll(): Promise<Project[]>
}
