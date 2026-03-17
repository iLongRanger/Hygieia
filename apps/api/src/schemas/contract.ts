import { z } from 'zod';
import { scheduleWeekdaySchema } from './serviceSchedule';

export const contractStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'pending_signature',
  'active',
  'expired',
  'terminated',
]);

export const serviceFrequencySchema = z.enum([
  '1x_week',
  '2x_week',
  '3x_week',
  '4x_week',
  '5x_week',
  '7x_week',
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

const contractServiceScheduleSchema = z
  .object({
    days: z.array(scheduleWeekdaySchema).min(1).max(7),
    allowedWindowStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use HH:mm (24-hour)').optional(),
    allowedWindowEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use HH:mm (24-hour)').optional(),
    windowAnchor: z.enum(['start_day']).optional(),
    timezoneSource: z.enum(['facility']).optional(),
    time: z.string().optional(),
    customDetails: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const unique = new Set(value.days);
    if (unique.size !== value.days.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Service days must be unique',
        path: ['days'],
      });
    }
  });

function expectedContractScheduleDays(
  frequency: z.infer<typeof serviceFrequencySchema> | null | undefined
): number | null {
  switch (frequency) {
    case '1x_week':
    case 'weekly':
    case 'bi_weekly':
    case 'monthly':
    case 'quarterly':
      return 1;
    case '2x_week':
      return 2;
    case '3x_week':
      return 3;
    case '4x_week':
      return 4;
    case '5x_week':
    case 'daily':
      return 5;
    case '7x_week':
      return 7;
    default:
      return null;
  }
}

function withServiceScheduleValidation<T extends z.ZodTypeAny>(
  schema: T,
  frequencyKey: string,
  scheduleKey: string
) {
  return schema.superRefine((data: any, ctx) => {
    const frequency = data[frequencyKey] as z.infer<typeof serviceFrequencySchema> | null | undefined;
    const schedule = data[scheduleKey] as z.infer<typeof contractServiceScheduleSchema> | null | undefined;
    if (!frequency || !schedule) return;

    const expected = expectedContractScheduleDays(frequency);
    if (expected !== null && schedule.days.length !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Selected frequency requires exactly ${expected} service day${expected === 1 ? '' : 's'}`,
        path: [scheduleKey, 'days'],
      });
    }
  });
}

const ALLOWED_TERMS_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const termsDocumentNameSchema = z.string().max(255).optional().nullable();
const termsDocumentMimeTypeSchema = z
  .enum(ALLOWED_TERMS_DOCUMENT_MIME_TYPES)
  .optional()
  .nullable();
const termsDocumentDataUrlSchema = z
  .string()
  .max(15_000_000, 'Terms document is too large')
  .regex(
    /^data:(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document);base64,[A-Za-z0-9+/=]+$/,
    'Terms document must be a valid PDF, DOC, or DOCX data URL'
  )
  .optional()
  .nullable();

const withTermsDocumentValidation = <T extends z.ZodTypeAny>(schema: T) =>
  schema.refine(
    (data: any) =>
      !data.termsDocumentDataUrl || (!!data.termsDocumentName && !!data.termsDocumentMimeType),
    {
      message: 'termsDocumentName and termsDocumentMimeType are required when termsDocumentDataUrl is provided',
      path: ['termsDocumentDataUrl'],
    }
  );

// Create Contract Schema
export const createContractSchema = z
  .object({
    title: z.string().min(1, 'Contract title is required').max(255),
    accountId: z.string().uuid(),
    facilityId: z.string().uuid(),
    proposalId: z.string().uuid().optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    serviceFrequency: serviceFrequencySchema.optional().nullable(),
    serviceSchedule: contractServiceScheduleSchema.optional().nullable(),
    autoRenew: z.boolean().optional().default(false),
    renewalNoticeDays: z.coerce.number().int().positive().optional().nullable(),
    monthlyValue: z.coerce.number().positive('Monthly value must be positive'),
    totalValue: z.coerce.number().nonnegative().optional().nullable(),
    billingCycle: billingCycleSchema.optional().default('monthly'),
    paymentTerms: z.string().max(50).optional().default('Net 30'),
    termsAndConditions: z.string().max(50000).optional().nullable(),
    termsDocumentName: termsDocumentNameSchema,
    termsDocumentMimeType: termsDocumentMimeTypeSchema,
    termsDocumentDataUrl: termsDocumentDataUrlSchema,
    specialInstructions: z.string().max(10000).optional().nullable(),
  })
  .refine(
    (data) => !data.endDate || data.endDate > data.startDate,
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

export const createContractSchemaValidated = withServiceScheduleValidation(
  createContractSchema,
  'serviceFrequency',
  'serviceSchedule'
);

export const createContractSchemaWithDocumentValidation =
  withTermsDocumentValidation(createContractSchemaValidated);

// Create Contract from Proposal Schema
export const createContractFromProposalSchema = z
  .object({
    proposalId: z.string().uuid(),
    title: z.string().min(1).max(255).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional().nullable(),
    autoRenew: z.boolean().optional(),
    renewalNoticeDays: z.coerce.number().int().positive().optional().nullable(),
    totalValue: z.coerce.number().nonnegative().optional().nullable(),
    billingCycle: billingCycleSchema.optional(),
    paymentTerms: z.string().max(50).optional(),
    termsAndConditions: z.string().max(50000).optional().nullable(),
    termsDocumentName: termsDocumentNameSchema,
    termsDocumentMimeType: termsDocumentMimeTypeSchema,
    termsDocumentDataUrl: termsDocumentDataUrlSchema,
    specialInstructions: z.string().max(10000).optional().nullable(),
  })
  .refine(
    (data) => !data.endDate || !data.startDate || data.endDate > data.startDate,
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

export const createContractFromProposalSchemaWithDocumentValidation =
  withTermsDocumentValidation(createContractFromProposalSchema);

// Update Contract Schema
export const updateContractSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    accountId: z.string().uuid().optional(),
    facilityId: z.string().uuid().optional().nullable(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional().nullable(),
    serviceFrequency: serviceFrequencySchema.optional().nullable(),
    serviceSchedule: contractServiceScheduleSchema.optional().nullable(),
    autoRenew: z.boolean().optional(),
    renewalNoticeDays: z.coerce.number().int().positive().optional().nullable(),
    monthlyValue: z.coerce.number().positive().optional(),
    totalValue: z.coerce.number().nonnegative().optional().nullable(),
    billingCycle: billingCycleSchema.optional(),
    paymentTerms: z.string().max(50).optional(),
    termsAndConditions: z.string().max(50000).optional().nullable(),
    termsDocumentName: termsDocumentNameSchema,
    termsDocumentMimeType: termsDocumentMimeTypeSchema,
    termsDocumentDataUrl: termsDocumentDataUrlSchema,
    specialInstructions: z.string().max(10000).optional().nullable(),
  })
  .refine(
    (data) => !data.endDate || !data.startDate || data.endDate > data.startDate,
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

export const updateContractSchemaValidated = withServiceScheduleValidation(
  updateContractSchema,
  'serviceFrequency',
  'serviceSchedule'
);

export const updateContractSchemaWithDocumentValidation =
  withTermsDocumentValidation(updateContractSchemaValidated);

// Update Contract Status Schema
export const updateContractStatusSchema = z.object({
  status: contractStatusSchema,
});

export const assignContractTeamSchema = z
  .object({
    teamId: z.string().uuid().nullable().optional(),
    assignedToUserId: z.string().uuid().nullable().optional(),
    effectivityDate: z.coerce.date().nullable().optional(),
    subcontractorTier: z.enum(['labor_only', 'standard', 'premium', 'independent']).optional(),
  })
  .refine((data) => !(data.teamId && data.assignedToUserId), {
    message: 'Assign either a subcontractor team or an internal employee, not both',
    path: ['teamId'],
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
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional().nullable(),
    monthlyValue: z.coerce.number().positive().optional(),
    serviceFrequency: serviceFrequencySchema.optional().nullable(),
    serviceSchedule: contractServiceScheduleSchema.optional().nullable(),
    autoRenew: z.boolean().optional(),
    renewalNoticeDays: z.coerce.number().int().positive().optional().nullable(),
    billingCycle: billingCycleSchema.optional(),
    paymentTerms: z.string().max(50).optional(),
    termsAndConditions: z.string().max(50000).optional().nullable(),
    termsDocumentName: termsDocumentNameSchema,
    termsDocumentMimeType: termsDocumentMimeTypeSchema,
    termsDocumentDataUrl: termsDocumentDataUrlSchema,
    specialInstructions: z.string().max(10000).optional().nullable(),
  })
  .refine(
    (data) => !data.endDate || !data.startDate || data.endDate > data.startDate,
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

export const renewContractSchemaValidated = withServiceScheduleValidation(
  renewContractSchema,
  'serviceFrequency',
  'serviceSchedule'
);

export const renewContractSchemaWithDocumentValidation =
  withTermsDocumentValidation(renewContractSchemaValidated);

// Create Standalone Contract Schema (for imported/legacy contracts)
export const createStandaloneContractSchema = z
  .object({
    title: z.string().min(1, 'Contract title is required').max(255),
    accountId: z.string().uuid(),
    facilityId: z.string().uuid().optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    serviceFrequency: serviceFrequencySchema.optional().nullable(),
    serviceSchedule: contractServiceScheduleSchema.optional().nullable(),
    autoRenew: z.boolean().optional().default(false),
    renewalNoticeDays: z.coerce.number().int().positive().optional().nullable(),
    monthlyValue: z.coerce.number().positive('Monthly value must be positive'),
    totalValue: z.coerce.number().nonnegative().optional().nullable(),
    billingCycle: billingCycleSchema.optional().default('monthly'),
    paymentTerms: z.string().max(50).optional().default('Net 30'),
    termsAndConditions: z.string().max(50000).optional().nullable(),
    termsDocumentName: termsDocumentNameSchema,
    termsDocumentMimeType: termsDocumentMimeTypeSchema,
    termsDocumentDataUrl: termsDocumentDataUrlSchema,
    specialInstructions: z.string().max(10000).optional().nullable(),
  })
  .refine(
    (data) => !data.endDate || data.endDate > data.startDate,
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    }
  );

export const createStandaloneContractSchemaValidated = withServiceScheduleValidation(
  createStandaloneContractSchema,
  'serviceFrequency',
  'serviceSchedule'
);

export const createStandaloneContractSchemaWithDocumentValidation =
  withTermsDocumentValidation(createStandaloneContractSchemaValidated);

// List Contracts Query Schema
export const listContractsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: contractStatusSchema.optional(),
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
  needsAttention: z
    .preprocess((value) => {
      if (value === true || value === 'true') return true;
      if (value === false || value === 'false') return false;
      return undefined;
    }, z.boolean().optional()),
  unassignedOnly: z
    .preprocess((value) => {
      if (value === true || value === 'true') return true;
      if (value === false || value === 'false') return false;
      return undefined;
    }, z.boolean().optional()),
  nearingRenewalOnly: z
    .preprocess((value) => {
      if (value === true || value === 'true') return true;
      if (value === false || value === 'false') return false;
      return undefined;
    }, z.boolean().optional()),
  renewalWindowDays: z.coerce.number().int().min(1).max(365).optional().default(30),
});

export const listContractsSummaryQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  renewalWindowDays: z.coerce.number().int().min(1).max(365).optional().default(30),
});

// Send Contract Schema
export const sendContractSchema = z.object({
  emailTo: z.string().email().optional(),
  emailCc: z.array(z.string().email()).optional(),
  emailSubject: z.string().min(1).max(200).optional(),
  emailBody: z.string().max(10000).optional(),
});

export const contractAmendmentStatusSchema = z.enum([
  'draft',
  'submitted',
  'approved',
  'sent',
  'viewed',
  'rejected',
  'signed',
  'applied',
  'canceled',
]);

export const contractAmendmentScopeSchema = z.record(z.any()).optional().nullable();

export const createContractAmendmentSchema = withServiceScheduleValidation(
  z.object({
    title: z.string().min(1).max(255).optional(),
    summary: z.string().max(10000).optional().nullable(),
    reason: z.string().max(10000).optional().nullable(),
    effectiveDate: z.coerce.date(),
    pricingPlanId: z.string().uuid().optional().nullable(),
    amendmentType: z.enum(['scope_change', 'pricing_change', 'schedule_change', 'terms_change', 'mixed']).optional(),
    newMonthlyValue: z.coerce.number().positive().optional().nullable(),
    newServiceFrequency: serviceFrequencySchema.optional().nullable(),
    newServiceSchedule: contractServiceScheduleSchema.optional().nullable(),
    pricingSnapshot: z.record(z.any()).optional().nullable(),
    workingScope: contractAmendmentScopeSchema,
  }),
  'newServiceFrequency',
  'newServiceSchedule'
);

export const updateContractAmendmentSchema = withServiceScheduleValidation(
  z.object({
    title: z.string().min(1).max(255).optional(),
    summary: z.string().max(10000).optional().nullable(),
    reason: z.string().max(10000).optional().nullable(),
    effectiveDate: z.coerce.date().optional(),
    pricingPlanId: z.string().uuid().optional().nullable(),
    amendmentType: z.enum(['scope_change', 'pricing_change', 'schedule_change', 'terms_change', 'mixed']).optional(),
    newMonthlyValue: z.coerce.number().positive().optional().nullable(),
    newServiceFrequency: serviceFrequencySchema.optional().nullable(),
    newServiceSchedule: contractServiceScheduleSchema.optional().nullable(),
    pricingSnapshot: z.record(z.any()).optional().nullable(),
    workingScope: contractAmendmentScopeSchema,
    status: z.enum(['draft', 'submitted', 'canceled']).optional(),
  }),
  'newServiceFrequency',
  'newServiceSchedule'
);

export const recalculateContractAmendmentSchema = withServiceScheduleValidation(
  z.object({
    pricingPlanId: z.string().uuid().optional().nullable(),
    newServiceFrequency: serviceFrequencySchema.optional().nullable(),
    newServiceSchedule: contractServiceScheduleSchema.optional().nullable(),
    workingScope: contractAmendmentScopeSchema,
  }),
  'newServiceFrequency',
  'newServiceSchedule'
);

export const rejectContractAmendmentSchema = z.object({
  rejectedReason: z.string().min(1).max(10000),
});

export const applyContractAmendmentSchema = z.object({
  forceApply: z.boolean().optional().default(false),
});

// Export types
export type SendContractInput = z.infer<typeof sendContractSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type CreateContractFromProposalInput = z.infer<typeof createContractFromProposalSchema>;
export type CreateContractAmendmentInput = z.infer<typeof createContractAmendmentSchema>;
export type UpdateContractAmendmentInput = z.infer<typeof updateContractAmendmentSchema>;
export type RecalculateContractAmendmentInput = z.infer<typeof recalculateContractAmendmentSchema>;
export type RejectContractAmendmentInput = z.infer<typeof rejectContractAmendmentSchema>;
export type ApplyContractAmendmentInput = z.infer<typeof applyContractAmendmentSchema>;
export type CreateStandaloneContractInput = z.infer<typeof createStandaloneContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type UpdateContractStatusInput = z.infer<typeof updateContractStatusSchema>;
export type AssignContractTeamInput = z.infer<typeof assignContractTeamSchema>;
export type SignContractInput = z.infer<typeof signContractSchema>;
export type TerminateContractInput = z.infer<typeof terminateContractSchema>;
export type RenewContractInput = z.infer<typeof renewContractSchema>;
export type ContractAmendmentStatus = z.infer<typeof contractAmendmentStatusSchema>;
export type ListContractsQuery = z.infer<typeof listContractsQuerySchema>;
export type ListContractsSummaryQuery = z.infer<typeof listContractsSummaryQuerySchema>;
