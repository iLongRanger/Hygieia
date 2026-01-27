import { z } from 'zod';

export const createFixtureTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(10000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateFixtureTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(10000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const listFixtureTypesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateFixtureTypeInput = z.infer<typeof createFixtureTypeSchema>;
export type UpdateFixtureTypeInput = z.infer<typeof updateFixtureTypeSchema>;
export type ListFixtureTypesQuery = z.infer<typeof listFixtureTypesQuerySchema>;
