import { z } from 'zod';

export const quotationStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
]);

// Quotation Service Schema
export const quotationServiceSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required').max(255),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().nonnegative('Price must be non-negative'),
  includedTasks: z.array(z.string()).optional().default([]),
  sortOrder: z.coerce.number().int().nonnegative().optional().default(0),
});

export const quotationServiceUpdateSchema = quotationServiceSchema.extend({
  id: z.string().uuid().optional(),
});

// Create Quotation Schema
export const createQuotationSchema = z.object({
  accountId: z.string().uuid(),
  facilityId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Quotation title is required').max(255),
  description: z.string().max(10000).optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
  taxRate: z.coerce.number().min(0).max(1).optional().default(0),
  notes: z.string().max(10000).optional().nullable(),
  termsAndConditions: z.string().max(50000).optional().nullable(),
  services: z.array(quotationServiceSchema).optional().default([]),
});

// Update Quotation Schema
export const updateQuotationSchema = z.object({
  accountId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(255).optional(),
  status: quotationStatusSchema.optional(),
  description: z.string().max(10000).optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
  taxRate: z.coerce.number().min(0).max(1).optional(),
  notes: z.string().max(10000).optional().nullable(),
  termsAndConditions: z.string().max(50000).optional().nullable(),
  services: z.array(quotationServiceUpdateSchema).optional(),
});

// List Quotations Query Schema
export const listQuotationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: quotationStatusSchema.optional(),
  accountId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum([
      'createdAt',
      'updatedAt',
      'quotationNumber',
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

// Send Quotation Schema
export const sendQuotationSchema = z.object({
  emailTo: z.string().email().optional(),
  emailCc: z.array(z.string().email()).optional(),
  emailSubject: z.string().min(1).max(200).optional(),
  emailBody: z.string().max(10000).optional(),
});

// Accept/Reject schemas
export const acceptQuotationSchema = z.object({
  signatureName: z.string().min(1).max(255).optional(),
  signatureDate: z.coerce.date().optional(),
});

export const rejectQuotationSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(5000),
});

// Public schemas
export const publicAcceptQuotationSchema = z.object({
  signatureName: z.string().min(1, 'Signature name is required').max(255),
});

export const publicRejectQuotationSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(5000),
});

// Export types
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
export type ListQuotationsQuery = z.infer<typeof listQuotationsQuerySchema>;
export type SendQuotationInput = z.infer<typeof sendQuotationSchema>;
export type AcceptQuotationInput = z.infer<typeof acceptQuotationSchema>;
export type RejectQuotationInput = z.infer<typeof rejectQuotationSchema>;
export type QuotationServiceInput = z.infer<typeof quotationServiceSchema>;
