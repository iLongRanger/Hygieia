import { z } from 'zod';

export const proposalStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
]);

export const proposalItemTypeSchema = z.enum([
  'labor',
  'materials',
  'equipment',
  'supplies',
  'other',
]);

export const serviceTypeSchema = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'one_time',
]);

export const serviceFrequencySchema = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'annually',
]);

// Proposal Item Schema
export const proposalItemSchema = z.object({
  itemType: proposalItemTypeSchema,
  description: z.string().min(1, 'Item description is required').max(5000),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unitPrice: z.coerce.number().nonnegative('Unit price must be non-negative'),
  totalPrice: z.coerce.number().nonnegative('Total price must be non-negative'),
  sortOrder: z.coerce.number().int().nonnegative().optional().default(0),
});

export const proposalItemUpdateSchema = proposalItemSchema.extend({
  id: z.string().uuid().optional(),
});

// Proposal Service Schema
export const proposalServiceSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required').max(255),
  serviceType: serviceTypeSchema,
  frequency: serviceFrequencySchema,
  estimatedHours: z.coerce.number().positive().optional().nullable(),
  hourlyRate: z.coerce.number().nonnegative().optional().nullable(),
  monthlyPrice: z.coerce.number().nonnegative('Monthly price must be non-negative'),
  description: z.string().max(5000).optional().nullable(),
  includedTasks: z.array(z.string()).optional().default([]),
  sortOrder: z.coerce.number().int().nonnegative().optional().default(0),
});

export const proposalServiceUpdateSchema = proposalServiceSchema.extend({
  id: z.string().uuid().optional(),
});

// Create Proposal Schema
export const createProposalSchema = z.object({
  accountId: z.string().uuid(),
  facilityId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Proposal title is required').max(255),
  description: z.string().max(10000).optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
  taxRate: z.coerce.number().min(0).max(1).optional().default(0),
  notes: z.string().max(10000).optional().nullable(),
  termsAndConditions: z.string().max(20000).optional().nullable(),
  proposalItems: z.array(proposalItemSchema).optional().default([]),
  proposalServices: z.array(proposalServiceSchema).optional().default([]),
  pricingPlanId: z.string().uuid().optional().nullable(),
});

// Update Proposal Schema
export const updateProposalSchema = z.object({
  accountId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(255).optional(),
  status: proposalStatusSchema.optional(),
  description: z.string().max(10000).optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
  taxRate: z.coerce.number().min(0).max(1).optional(),
  notes: z.string().max(10000).optional().nullable(),
  termsAndConditions: z.string().max(20000).optional().nullable(),
  proposalItems: z.array(proposalItemUpdateSchema).optional(),
  proposalServices: z.array(proposalServiceUpdateSchema).optional(),
  pricingPlanId: z.string().uuid().optional().nullable(),
});

// List Proposals Query Schema
export const listProposalsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: proposalStatusSchema.optional(),
  accountId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'proposalNumber',
      'title',
      'totalAmount',
      'validUntil',
      'sentAt',
    ])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// Send Proposal Schema
export const sendProposalSchema = z.object({
  emailTo: z.string().email().optional(),
  emailCc: z.array(z.string().email()).optional(),
  emailSubject: z.string().min(1).max(200).optional(),
  emailBody: z.string().max(10000).optional(),
});

// Accept/Reject Proposal Schema
export const acceptProposalSchema = z.object({
  signatureName: z.string().min(1).max(255).optional(),
  signatureDate: z.coerce.date().optional(),
});

export const rejectProposalSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(5000),
});

// ============================================================
// PRICING PLAN SCHEMAS
// ============================================================

// Extended frequency schema for pricing calculations
export const pricingFrequencySchema = z.enum([
  '1x_week',
  '2x_week',
  '3x_week',
  '4x_week',
  '5x_week',
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
]);

// Change pricing plan
export const changePricingPlanSchema = z.object({
  pricingPlanId: z.string().uuid(),
});

// Recalculate pricing
export const recalculatePricingSchema = z.object({
  serviceFrequency: pricingFrequencySchema,
  lockAfterRecalculation: z.boolean().optional().default(false),
  workerCount: z.coerce.number().int().min(1).optional(),
});

// Pricing preview query
export const pricingPreviewQuerySchema = z.object({
  serviceFrequency: pricingFrequencySchema,
  pricingPlanId: z.string().uuid().optional(),
  workerCount: z.coerce.number().int().min(1).optional(),
});

// Export types
export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;
export type ListProposalsQuery = z.infer<typeof listProposalsQuerySchema>;
export type SendProposalInput = z.infer<typeof sendProposalSchema>;
export type AcceptProposalInput = z.infer<typeof acceptProposalSchema>;
export type RejectProposalInput = z.infer<typeof rejectProposalSchema>;
export type ProposalItemInput = z.infer<typeof proposalItemSchema>;
export type ProposalServiceInput = z.infer<typeof proposalServiceSchema>;
export type ChangePricingPlanInput = z.infer<typeof changePricingPlanSchema>;
export type RecalculatePricingInput = z.infer<typeof recalculatePricingSchema>;
export type PricingPreviewQuery = z.infer<typeof pricingPreviewQuerySchema>;
