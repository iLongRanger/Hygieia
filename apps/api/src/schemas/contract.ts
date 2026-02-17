import { z } from 'zod';

export const contractStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'pending_signature',
  'active',
  'expired',
  'terminated',
  'renewed',
]);

export const contractSourceSchema = z.enum([
  'proposal',
  'imported',
  'legacy',
  'renewal',
]);

export const serviceFrequencySchema = z.enum([
  'daily',
  'weekly',
  'bi_weekly',
  'monthly',
  'quarterly',
  'custom',
]);

export const billingCycleSchema = z.enum([
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
]);

// Create Contract Schema
export const createContractSchema = z
  .object({
    title: z.string().min(1, 'Contract title is required').max(255),
    accountId: z.string().uuid(),
    facilityId: z.string().uuid().optional().nullable(),
    proposalId: z.string().uuid().optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    serviceFrequency: serviceFrequencySchema.optional().nullable(),
    serviceSchedule: z.any().optional().nullable(),
    autoRenew: z.boolean().optional().default(false),
    renewalNoticeDays: z.coerce.number().int().positive().optional().nullable(),
    monthlyValue: z.coerce.number().positive('Monthly value must be positive'),
    totalValue: z.coerce.number().nonnegative().optional().nullable(),
    billingCycle: billingCycleSchema.optional().default('monthly'),
    paymentTerms: z.string().max(50).optional().default('Net 30'),
    termsAndConditions: z.string().max(50000).optional().nullable(),
    specialInstructions: z.string().max(10000).optional().nullable(),
  })
  .refine(
    (data) => !data.endDate || data.endDate > data.startDate,
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

// Create Contract from Proposal Schema
export const createContractFromProposalSchema = z
  .object({
    proposalId: z.string().uuid(),
    title: z.string().min(1).max(255).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional().nullable(),
    serviceFrequency: serviceFrequencySchema.optional().nullable(),
    serviceSchedule: z.any().optional().nullable(),
    autoRenew: z.boolean().optional(),
    renewalNoticeDays: z.coerce.number().int().positive().optional().nullable(),
    totalValue: z.coerce.number().nonnegative().optional().nullable(),
    billingCycle: billingCycleSchema.optional(),
    paymentTerms: z.string().max(50).optional(),
    termsAndConditions: z.string().max(50000).optional().nullable(),
    specialInstructions: z.string().max(10000).optional().nullable(),
  })
  .refine(
    (data) => !data.endDate || !data.startDate || data.endDate > data.startDate,
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

// Update Contract Schema
export const updateContractSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    accountId: z.string().uuid().optional(),
    facilityId: z.string().uuid().optional().nullable(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional().nullable(),
    serviceFrequency: serviceFrequencySchema.optional().nullable(),
    serviceSchedule: z.any().optional().nullable(),
    autoRenew: z.boolean().optional(),
    renewalNoticeDays: z.coerce.number().int().positive().optional().nullable(),
    monthlyValue: z.coerce.number().positive().optional(),
    totalValue: z.coerce.number().nonnegative().optional().nullable(),
    billingCycle: billingCycleSchema.optional(),
    paymentTerms: z.string().max(50).optional(),
    termsAndConditions: z.string().max(50000).optional().nullable(),
    specialInstructions: z.string().max(10000).optional().nullable(),
  })
  .refine(
    (data) => !data.endDate || !data.startDate || data.endDate > data.startDate,
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

// Update Contract Status Schema
export const updateContractStatusSchema = z.object({
  status: contractStatusSchema,
});

export const assignContractTeamSchema = z.object({
  teamId: z.string().uuid().nullable(),
  subcontractorTier: z.enum(['labor_only', 'standard', 'premium', 'independent']).optional(),
});

// Sign Contract Schema
export const signContractSchema = z.object({
  signedDate: z.coerce.date(),
  signedByName: z.string().min(1, 'Signer name is required').max(255),
  signedByEmail: z.string().email('Valid email is required'),
  signedDocumentUrl: z.string().url().optional().nullable(),
});

// Terminate Contract Schema
export const terminateContractSchema = z.object({
  terminationReason: z.string().min(1, 'Termination reason is required').max(5000),
});

// Renew Contract Schema
export const renewContractSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    monthlyValue: z.coerce.number().positive().optional(),
    serviceFrequency: serviceFrequencySchema.optional().nullable(),
    serviceSchedule: z.any().optional().nullable(),
    autoRenew: z.boolean().optional(),
    renewalNoticeDays: z.coerce.number().int().positive().optional().nullable(),
    billingCycle: billingCycleSchema.optional(),
    paymentTerms: z.string().max(50).optional(),
    termsAndConditions: z.string().max(50000).optional().nullable(),
    specialInstructions: z.string().max(10000).optional().nullable(),
  })
  .refine(
    (data) => !data.endDate || data.endDate > data.startDate,
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

// Create Standalone Contract Schema (for imported/legacy contracts)
export const createStandaloneContractSchema = z
  .object({
    title: z.string().min(1, 'Contract title is required').max(255),
    contractSource: z.enum(['imported', 'legacy']),
    accountId: z.string().uuid(),
    facilityId: z.string().uuid().optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    serviceFrequency: serviceFrequencySchema.optional().nullable(),
    serviceSchedule: z.any().optional().nullable(),
    autoRenew: z.boolean().optional().default(false),
    renewalNoticeDays: z.coerce.number().int().positive().optional().nullable(),
    monthlyValue: z.coerce.number().positive('Monthly value must be positive'),
    totalValue: z.coerce.number().nonnegative().optional().nullable(),
    billingCycle: billingCycleSchema.optional().default('monthly'),
    paymentTerms: z.string().max(50).optional().default('Net 30'),
    termsAndConditions: z.string().max(50000).optional().nullable(),
    specialInstructions: z.string().max(10000).optional().nullable(),
  })
  .refine(
    (data) => !data.endDate || data.endDate > data.startDate,
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

// List Contracts Query Schema
export const listContractsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: contractStatusSchema.optional(),
  contractSource: contractSourceSchema.optional(),
  accountId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  proposalId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'contractNumber',
      'title',
      'startDate',
      'endDate',
      'monthlyValue',
    ])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// Send Contract Schema
export const sendContractSchema = z.object({
  emailTo: z.string().email().optional(),
  emailCc: z.array(z.string().email()).optional(),
  emailSubject: z.string().min(1).max(200).optional(),
  emailBody: z.string().max(10000).optional(),
});

// Export types
export type SendContractInput = z.infer<typeof sendContractSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type CreateContractFromProposalInput = z.infer<typeof createContractFromProposalSchema>;
export type CreateStandaloneContractInput = z.infer<typeof createStandaloneContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type UpdateContractStatusInput = z.infer<typeof updateContractStatusSchema>;
export type AssignContractTeamInput = z.infer<typeof assignContractTeamSchema>;
export type SignContractInput = z.infer<typeof signContractSchema>;
export type TerminateContractInput = z.infer<typeof terminateContractSchema>;
export type RenewContractInput = z.infer<typeof renewContractSchema>;
export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>;
