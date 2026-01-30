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
  estimatedMinutes: z.coerce.number().int().min(0).optional().nullable(), // Optional for sqft-based pricing
  baseMinutes: z.coerce.number().min(0).optional().default(0),
  perSqftMinutes: z.coerce.number().min(0).optional().default(0),
  perUnitMinutes: z.coerce.number().min(0).optional().default(0),
  perRoomMinutes: z.coerce.number().min(0).optional().default(0),
  difficultyLevel: z.coerce.number().int().min(1).max(5).optional().default(3),
  requiredEquipment: z.array(z.string()).optional().default([]),
  requiredSupplies: z.array(z.string()).optional().default([]),
  instructions: z.string().max(50000).optional().nullable(),
  isGlobal: z.boolean().optional().default(false),
  facilityId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  fixtureMinutes: z.array(
    z.object({
      fixtureTypeId: z.string().uuid(),
      minutesPerFixture: z.coerce.number().min(0),
    })
  ).optional().default([]),
});

export const updateTaskTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional().nullable(),
  cleaningType: cleaningTypeSchema.optional(),
  areaTypeId: z.string().uuid().optional().nullable(),
  estimatedMinutes: z.coerce.number().int().min(0).optional(),
  baseMinutes: z.coerce.number().min(0).optional(),
  perSqftMinutes: z.coerce.number().min(0).optional(),
  perUnitMinutes: z.coerce.number().min(0).optional(),
  perRoomMinutes: z.coerce.number().min(0).optional(),
  difficultyLevel: z.coerce.number().int().min(1).max(5).optional(),
  requiredEquipment: z.array(z.string()).optional(),
  requiredSupplies: z.array(z.string()).optional(),
  instructions: z.string().max(50000).optional().nullable(),
  isGlobal: z.boolean().optional(),
  facilityId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
  fixtureMinutes: z.array(
    z.object({
      fixtureTypeId: z.string().uuid(),
      minutesPerFixture: z.coerce.number().min(0),
    })
  ).optional(),
});

const booleanQueryParam = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

export const listTaskTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cleaningType: cleaningTypeSchema.optional(),
  areaTypeId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  isGlobal: booleanQueryParam,
  isActive: booleanQueryParam,
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'name', 'estimatedMinutes']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: booleanQueryParam,
});

export type CreateTaskTemplateInput = z.infer<typeof createTaskTemplateSchema>;
export type UpdateTaskTemplateInput = z.infer<typeof updateTaskTemplateSchema>;
export type ListTaskTemplatesQuery = z.infer<
  typeof listTaskTemplatesQuerySchema
>;
