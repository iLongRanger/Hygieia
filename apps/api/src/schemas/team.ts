import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(255),
  contactName: z.string().max(255).optional().nullable(),
  contactEmail: z.string().email('Invalid email format').max(255).optional().nullable(),
  contactPhone: z.string().max(20).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateTeamSchema = createTeamSchema.partial();

export const listTeamsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().max(100).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'isActive']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type ListTeamsQuery = z.infer<typeof listTeamsQuerySchema>;
