import { z } from 'zod';
import { leadStatusSchema } from './lead';

export const listOpportunitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: leadStatusSchema.optional(),
  accountId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  ownerUserId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type ListOpportunitiesQuery = z.infer<typeof listOpportunitiesQuerySchema>;

export const updateOpportunitySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.string().max(30).optional(),
  source: z.string().max(100).nullable().optional(),
  estimatedValue: z.number().min(0).nullable().optional(),
  probability: z.number().int().min(0).max(100).nullable().optional(),
  expectedCloseDate: z.string().optional().nullable(),
  lostReason: z.string().nullable().optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  accountId: z.string().uuid().nullable().optional(),
  facilityId: z.string().uuid().nullable().optional(),
  primaryContactId: z.string().uuid().nullable().optional(),
});

export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
