import { z } from 'zod';

export const pricingTypeSchema = z.enum([
  'hourly',
  'square_foot',
  'fixed',
  'per_unit',
]);

export const conditionMultipliersSchema = z.object({
  excellent: z.number().min(0).max(5).default(0.8),
  good: z.number().min(0).max(5).default(1.0),
  fair: z.number().min(0).max(5).default(1.3),
  poor: z.number().min(0).max(5).default(1.6),
}).default({
  excellent: 0.8,
  good: 1.0,
  fair: 1.3,
  poor: 1.6,
});

export const createPricingRuleSchema = z.object({
  name: z.string().min(1, 'Pricing rule name is required').max(255),
  description: z.string().max(10000).optional().nullable(),
  pricingType: pricingTypeSchema,
  baseRate: z.coerce.number().min(0, 'Base rate must be non-negative'),
  minimumCharge: z.coerce.number().min(0).optional().nullable(),
  squareFootRate: z.coerce.number().min(0).optional().nullable(),
  difficultyMultiplier: z.coerce.number().min(0).max(10).optional().default(1.0),
  conditionMultipliers: conditionMultipliersSchema.optional(),
  cleaningType: z.string().max(50).optional().nullable(),
  areaTypeId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updatePricingRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional().nullable(),
  pricingType: pricingTypeSchema.optional(),
  baseRate: z.coerce.number().min(0).optional(),
  minimumCharge: z.coerce.number().min(0).optional().nullable(),
  squareFootRate: z.coerce.number().min(0).optional().nullable(),
  difficultyMultiplier: z.coerce.number().min(0).max(10).optional(),
  conditionMultipliers: conditionMultipliersSchema.optional(),
  cleaningType: z.string().max(50).optional().nullable(),
  areaTypeId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const listPricingRulesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  pricingType: pricingTypeSchema.optional(),
  cleaningType: z.string().max(50).optional(),
  areaTypeId: z.string().uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'name',
      'baseRate',
      'pricingType',
    ])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;
export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>;
export type ListPricingRulesQuery = z.infer<typeof listPricingRulesQuerySchema>;
