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
  converted: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// Convert Lead to Account Schema
export const convertLeadSchema = z.object({
  // Account creation options
  createNewAccount: z.boolean().default(true),
  existingAccountId: z.string().uuid().optional().nullable(),

  // Account data (used when createNewAccount is true)
  accountData: z
    .object({
      name: z.string().min(1, 'Account name is required').max(255),
      type: z.enum(['commercial', 'residential', 'industrial', 'government', 'non_profit']),
      industry: z.string().max(100).optional().nullable(),
      website: z.string().url().max(500).optional().nullable(),
      billingEmail: z.string().email().max(255).optional().nullable(),
      billingPhone: z.string().max(20).optional().nullable(),
      paymentTerms: z.string().max(50).optional().default('NET30'),
      notes: z.string().max(10000).optional().nullable(),
    })
    .optional(),

  // Facility creation options
  createFacility: z.boolean().default(false),
  facilityData: z
    .object({
      name: z.string().min(1, 'Facility name is required').max(255),
      buildingType: z.string().max(50).optional().nullable(),
      squareFeet: z.coerce.number().positive().optional().nullable(),
      accessInstructions: z.string().max(5000).optional().nullable(),
      notes: z.string().max(10000).optional().nullable(),
    })
    .optional(),
}).refine(
  (data) => data.createNewAccount || data.existingAccountId,
  {
    message: 'Either createNewAccount must be true or existingAccountId must be provided',
    path: ['existingAccountId'],
  }
).refine(
  (data) => !data.createNewAccount || data.accountData,
  {
    message: 'accountData is required when createNewAccount is true',
    path: ['accountData'],
  }
).refine(
  (data) => !data.createFacility || data.facilityData,
  {
    message: 'facilityData is required when createFacility is true',
    path: ['facilityData'],
  }
);

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
