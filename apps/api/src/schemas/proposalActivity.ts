import { z } from 'zod';

export const listActivitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;
