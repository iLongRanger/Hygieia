import { z } from 'zod';

export const createPricingOverrideSchema = z.object({
  facilityId: z.string().uuid('Valid facility ID is required'),
  pricingRuleId: z.string().uuid('Valid pricing rule ID is required'),
  overrideRate: z.coerce.number().min(0, 'Override rate must be non-negative'),
  overrideReason: z.string().min(1, 'Override reason is required').max(10000),
  effectiveDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional().nullable(),
});

export const updatePricingOverrideSchema = z.object({
  overrideRate: z.coerce.number().min(0).optional(),
  overrideReason: z.string().min(1).max(10000).optional(),
  effectiveDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional().nullable(),
  approvedByUserId: z.string().uuid().optional().nullable(),
});

export const listPricingOverridesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  facilityId: z.string().uuid().optional(),
  pricingRuleId: z.string().uuid().optional(),
  approvedByUserId: z.string().uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'effectiveDate',
      'expiryDate',
      'overrideRate',
    ])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreatePricingOverrideInput = z.infer<typeof createPricingOverrideSchema>;
export type UpdatePricingOverrideInput = z.infer<typeof updatePricingOverrideSchema>;
export type ListPricingOverridesQuery = z.infer<typeof listPricingOverridesQuerySchema>;
