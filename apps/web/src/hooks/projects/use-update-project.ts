import type { UpdateProjectRequest } from "@neoglito/shared";
import { projectService } from "@neoglito/web/services/project.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: number;
      data: UpdateProjectRequest;
    }) => projectService.update(projectId, data),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
    },
  });
}