import { z } from 'zod';

const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255)
  .optional()
  .nullable();
const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format')
  .optional()
  .nullable();

export const leadStatusSchema = z.enum([
  'lead',
  'walk_through_booked',
  'walk_through_completed',
  'proposal_sent',
  'negotiation',
  'won',
  'lost',
  'reopened',
]);

export const addressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .optional()
  .nullable();

export const createLeadSchema = z.object({
  leadSourceId: z.string().uuid().optional().nullable(),
  companyName: z.string().max(255).optional().nullable(),
  contactName: z.string().min(1, 'Contact name is required').max(255),
  primaryEmail: emailSchema,
  primaryPhone: phoneSchema,
  secondaryEmail: emailSchema,
  secondaryPhone: phoneSchema,
  address: addressSchema,
  estimatedValue: z.coerce.number().min(0).optional().nullable(),
  probability: z.coerce.number().int().min(0).max(100).optional().default(0),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
});

export const updateLeadSchema = z.object({
  leadSourceId: z.string().uuid().optional().nullable(),
  status: leadStatusSchema.optional(),
  companyName: z.string().max(255).optional().nullable(),
  contactName: z.string().min(1).max(255).optional(),
  primaryEmail: emailSchema,
  primaryPhone: phoneSchema,
  secondaryEmail: emailSchema,
  secondaryPhone: phoneSchema,
  address: addressSchema,
  estimatedValue: z.coerce.number().min(0).optional().nullable(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  lostReason: z.string().max(1000).optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
});

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: leadStatusSchema.optional(),
  leadSourceId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'contactName',
      'companyName',
      'estimatedValue',
      'expectedCloseDate',
    ])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
