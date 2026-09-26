import type { ProjectDetailRepository } from '../../components/repositories/project-detail-modal';
import type { ProjectDetailRepositoryInfo } from '../../components/repositories/project-detail-view';
import type { Project } from '../../models/project';
import type { Repository } from '../../models/repository';

export function getVisibleRepositories(
  repositories: Repository[],
  query: string,
): Repository[] {
  const normalizedQuery = query.trim().toLowerCase();

  return repositories.filter(
    (repository) =>
      repository.name.toLowerCase().includes(normalizedQuery) ||
      repository.description.toLowerCase().includes(normalizedQuery),
  );
}

export function getProjectCountByRepositoryId(
  projects: Project[],
): Map<number, number> {
  const counts = new Map<number, number>();

  for (const project of projects) {
    for (const repository of project.repositories) {
      counts.set(repository.id, (counts.get(repository.id) ?? 0) + 1);
    }
  }

  return counts;
}

export function getProjectDetailRepositories(
  project: Project | null,
  repositories: Repository[],
  projectCountByRepositoryId: Map<number, number>,
): ProjectDetailRepository[] {
  if (!project) return [];

  return project.repositories.map((linkedRepository) => {
    const liveRepository = repositories.find(
      (repository) => repository.id === linkedRepository.id,
    );
    const others =
      (projectCountByRepositoryId.get(linkedRepository.id) ?? 1) - 1;

    return {
      id: linkedRepository.id,
      full: liveRepository?.name ?? linkedRepository.name,
      description: liveRepository?.description ?? 'Sin descripción',
      language: liveRepository?.language ?? 'Desconocido',
      visibility: liveRepository
        ? liveRepository.private
          ? 'Privado'
          : 'Público'
        : 'Desconocido',
      shared:
        others === 0
          ? 'Solo aquí'
          : others === 1
            ? 'También en 1 proyecto'
            : `También en ${others} proyectos`,
    };
  });
}

export function getProjectDeployRepositories(
  project: Project | null,
  repositories: Repository[],
): ProjectDetailRepositoryInfo[] {
  if (!project) return [];

  return project.repositories.map((linkedRepository) => {
    const liveRepository = repositories.find(
      (repository) => repository.id === linkedRepository.id,
    );

    return {
      id: linkedRepository.id,
      name: liveRepository?.name ?? linkedRepository.name,
      language: liveRepository?.language ?? 'Desconocido',
    };
  });
}

export function isProjectNameTaken(projects: Project[], name: string): boolean {
  const normalizedName = name.trim().toLowerCase();

  return (
    normalizedName.length > 0 &&
    projects.some(
      (project) => project.name.trim().toLowerCase() === normalizedName,
    )
  );
}
