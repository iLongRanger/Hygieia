import { z } from 'zod';

export const cleaningFrequencySchema = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'annual',
  'as_needed',
]);

export const createFacilityTaskSchema = z
  .object({
    facilityId: z.string().uuid('Invalid facility ID'),
    areaId: z.string().uuid().optional().nullable(),
    taskTemplateId: z.string().uuid().optional().nullable(),
    customName: z
      .string()
      .max(255)
      .optional()
      .nullable()
      .transform((val) => (val?.trim() === '' ? null : val)),
    customInstructions: z.string().max(50000).optional().nullable(),
    estimatedMinutes: z.coerce.number().int().min(0).optional().nullable(),
    baseMinutesOverride: z.coerce.number().min(0).optional().nullable(),
    perSqftMinutesOverride: z.coerce.number().min(0).optional().nullable(),
    perUnitMinutesOverride: z.coerce.number().min(0).optional().nullable(),
    perRoomMinutesOverride: z.coerce.number().min(0).optional().nullable(),
    isRequired: z.boolean().optional().default(true),
    cleaningFrequency: cleaningFrequencySchema.optional().default('daily'),
    conditionMultiplier: z.coerce
      .number()
      .min(0.1)
      .max(5)
      .optional()
      .default(1.0),
    priority: z.coerce.number().int().min(1).max(5).optional().default(3),
    fixtureMinutes: z.array(
      z.object({
        fixtureTypeId: z.string().uuid(),
        minutesPerFixture: z.coerce.number().min(0),
      })
    ).optional().default([]),
  })
  .refine((data) => data.customName || data.taskTemplateId, {
    message: 'Either customName or taskTemplateId must be provided',
    path: ['customName'],
  });

export const updateFacilityTaskSchema = z.object({
  areaId: z.string().uuid().optional().nullable(),
  taskTemplateId: z.string().uuid().optional().nullable(),
  customName: z.string().max(255).optional().nullable(),
  customInstructions: z.string().max(50000).optional().nullable(),
  estimatedMinutes: z.coerce.number().int().min(0).optional().nullable(),
  baseMinutesOverride: z.coerce.number().min(0).optional().nullable(),
  perSqftMinutesOverride: z.coerce.number().min(0).optional().nullable(),
  perUnitMinutesOverride: z.coerce.number().min(0).optional().nullable(),
  perRoomMinutesOverride: z.coerce.number().min(0).optional().nullable(),
  isRequired: z.boolean().optional(),
  cleaningFrequency: cleaningFrequencySchema.optional(),
  conditionMultiplier: z.coerce.number().min(0.1).max(5).optional(),
  priority: z.coerce.number().int().min(1).max(5).optional(),
  fixtureMinutes: z.array(
    z.object({
      fixtureTypeId: z.string().uuid(),
      minutesPerFixture: z.coerce.number().min(0),
    })
  ).optional(),
});

export const listFacilityTasksQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  facilityId: z.string().uuid().optional(),
  areaId: z.string().uuid().optional(),
  taskTemplateId: z.string().uuid().optional(),
  cleaningFrequency: cleaningFrequencySchema.optional(),
  isRequired: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  priority: z.coerce.number().int().min(1).max(5).optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum(['createdAt', 'priority', 'estimatedMinutes', 'cleaningFrequency'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreateFacilityTaskInput = z.infer<typeof createFacilityTaskSchema>;
export type UpdateFacilityTaskInput = z.infer<typeof updateFacilityTaskSchema>;
export type ListFacilityTasksQuery = z.infer<
  typeof listFacilityTasksQuerySchema
>;
