import { z } from 'zod';

export const opportunityStatusSchema = z.enum([
  'prospecting',
  'qualification',
  'needs_analysis',
  'value_proposition',
  'negotiation',
  'closed_won',
  'closed_lost',
]);

export const createOpportunitySchema = z.object({
  leadId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Opportunity name is required').max(255),
  status: opportunityStatusSchema.optional().default('prospecting'),
  probability: z.coerce.number().int().min(0).max(100).optional().nullable(),
  expectedValue: z.coerce.number().min(0).optional().nullable(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
});

export const updateOpportunitySchema = z.object({
  leadId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255).optional(),
  status: opportunityStatusSchema.optional(),
  probability: z.coerce.number().int().min(0).max(100).optional().nullable(),
  expectedValue: z.coerce.number().min(0).optional().nullable(),
  actualValue: z.coerce.number().min(0).optional().nullable(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  actualCloseDate: z.coerce.date().optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
});

export const listOpportunitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: opportunityStatusSchema.optional(),
  leadId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'name',
      'expectedValue',
      'probability',
      'expectedCloseDate',
    ])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export type ListOpportunitiesQuery = z.infer<typeof listOpportunitiesQuerySchema>;
