import { z } from 'zod';

export const createAreaTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(5000).optional().nullable(),
  defaultSquareFeet: z.coerce.number().min(0).optional().nullable(),
  baseCleaningTimeMinutes: z.coerce.number().int().min(0).optional().nullable(),
});

export const updateAreaTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(5000).optional().nullable(),
  defaultSquareFeet: z.coerce.number().min(0).optional().nullable(),
  baseCleaningTimeMinutes: z.coerce.number().int().min(0).optional().nullable(),
});

export const listAreaTypesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateAreaTypeInput = z.infer<typeof createAreaTypeSchema>;
export type UpdateAreaTypeInput = z.infer<typeof updateAreaTypeSchema>;
export type ListAreaTypesQuery = z.infer<typeof listAreaTypesQuerySchema>;
