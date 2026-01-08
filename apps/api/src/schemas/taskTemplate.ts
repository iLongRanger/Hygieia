import { z } from 'zod';

export const cleaningTypeSchema = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'annual',
  'deep_clean',
  'move_out',
  'post_construction',
]);

export const createTaskTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(10000).optional().nullable(),
  cleaningType: cleaningTypeSchema,
  areaTypeId: z.string().uuid().optional().nullable(),
  estimatedMinutes: z.coerce.number().int().min(1),
  difficultyLevel: z.coerce.number().int().min(1).max(5).optional().default(3),
  requiredEquipment: z.array(z.string()).optional().default([]),
  requiredSupplies: z.array(z.string()).optional().default([]),
  instructions: z.string().max(50000).optional().nullable(),
  isGlobal: z.boolean().optional().default(false),
  facilityId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateTaskTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional().nullable(),
  cleaningType: cleaningTypeSchema.optional(),
  areaTypeId: z.string().uuid().optional().nullable(),
  estimatedMinutes: z.coerce.number().int().min(1).optional(),
  difficultyLevel: z.coerce.number().int().min(1).max(5).optional(),
  requiredEquipment: z.array(z.string()).optional(),
  requiredSupplies: z.array(z.string()).optional(),
  instructions: z.string().max(50000).optional().nullable(),
  isGlobal: z.boolean().optional(),
  facilityId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const listTaskTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cleaningType: cleaningTypeSchema.optional(),
  areaTypeId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  isGlobal: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'name', 'estimatedMinutes']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreateTaskTemplateInput = z.infer<typeof createTaskTemplateSchema>;
export type UpdateTaskTemplateInput = z.infer<typeof updateTaskTemplateSchema>;
export type ListTaskTemplatesQuery = z.infer<
  typeof listTaskTemplatesQuerySchema
>;
