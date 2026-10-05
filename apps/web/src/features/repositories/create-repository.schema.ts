import { z } from 'zod'

export const createRepositorySchema = z.object({
  projectId: z.number().int().positive(),
  id: z.number().int().positive(),
  name: z.string().trim().min(1),
  gitUrl: z.string().trim().min(1),
  cloneUrl: z.string().trim().min(1),
})

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>
