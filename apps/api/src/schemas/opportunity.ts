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
