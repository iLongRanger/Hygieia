import { z } from 'zod';

export const conditionLevelSchema = z.enum([
  'standard',
  'medium',
  'hard',
]);

export const trafficLevelSchema = z.enum([
  'low',
  'medium',
  'high',
]);

export const floorTypeSchema = z.enum([
  'vct',
  'carpet',
  'tile',
  'hardwood',
  'concrete',
  'other',
]);

const fixtureInputSchema = z.object({
  fixtureTypeId: z.string().uuid('Invalid fixture type ID'),
  count: z.coerce.number().int().min(0),
});

export const createAreaSchema = z.object({
  facilityId: z.string().uuid('Invalid facility ID'),
  areaTypeId: z.string().uuid('Invalid area type ID'),
  name: z.string().max(255).optional().nullable(),
  quantity: z.coerce.number().int().min(1).optional().default(1),
  squareFeet: z.coerce.number().min(0).optional().nullable(),
  floorType: floorTypeSchema.optional().default('vct'),
  conditionLevel: conditionLevelSchema.optional().default('standard'),
  roomCount: z.coerce.number().int().min(0).optional().default(0),
  unitCount: z.coerce.number().int().min(0).optional().default(0),
  trafficLevel: trafficLevelSchema.optional().default('medium'),
  notes: z.string().max(10000).optional().nullable(),
  fixtures: z.array(fixtureInputSchema).optional().default([]),
});

export const updateAreaSchema = z.object({
  areaTypeId: z.string().uuid().optional(),
  name: z.string().max(255).optional().nullable(),
  quantity: z.coerce.number().int().min(1).optional(),
  squareFeet: z.coerce.number().min(0).optional().nullable(),
  floorType: floorTypeSchema.optional(),
  conditionLevel: conditionLevelSchema.optional(),
  roomCount: z.coerce.number().int().min(0).optional(),
  unitCount: z.coerce.number().int().min(0).optional(),
  trafficLevel: trafficLevelSchema.optional(),
  notes: z.string().max(10000).optional().nullable(),
  fixtures: z.array(fixtureInputSchema).optional(),
});

export const listAreasQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  facilityId: z.string().uuid().optional(),
  areaTypeId: z.string().uuid().optional(),
  floorType: floorTypeSchema.optional(),
  conditionLevel: conditionLevelSchema.optional(),
  trafficLevel: trafficLevelSchema.optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'name', 'squareFeet', 'floorType']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type ListAreasQuery = z.infer<typeof listAreasQuerySchema>;
