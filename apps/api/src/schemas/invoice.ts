import { z } from 'zod';

export const listInvoicesSchema = z.object({
  query: z.object({
    accountId: z.string().uuid().optional(),
    contractId: z.string().uuid().optional(),
    facilityId: z.string().uuid().optional(),
    status: z.enum(['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'void', 'written_off']).optional(),
    overdue: z.enum(['true']).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

const invoiceItemSchema = z.object({
  itemType: z.enum(['service', 'additional', 'adjustment', 'credit']).optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unitPrice: z.number(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    contractId: z.string().uuid().optional().nullable(),
    accountId: z.string().uuid(),
    facilityId: z.string().uuid().optional().nullable(),
    issueDate: z.string(),
    dueDate: z.string(),
    periodStart: z.string().optional().nullable(),
    periodEnd: z.string().optional().nullable(),
    taxRate: z.number().min(0).max(1).optional(),
    notes: z.string().max(2000).optional().nullable(),
    paymentInstructions: z.string().max(2000).optional().nullable(),
    items: z.array(invoiceItemSchema).min(1),
  }),
});

export const updateInvoiceSchema = z.object({
  body: z.object({
    issueDate: z.string().optional(),
    dueDate: z.string().optional(),
    taxRate: z.number().min(0).max(1).optional(),
    notes: z.string().max(2000).optional().nullable(),
    paymentInstructions: z.string().max(2000).optional().nullable(),
    items: z.array(invoiceItemSchema).min(1).optional(),
  }),
});

export const recordPaymentSchema = z.object({
  body: z.object({
    paymentDate: z.string(),
    amount: z.number().positive(),
    paymentMethod: z.enum(['check', 'ach', 'credit_card', 'cash', 'other']),
    referenceNumber: z.string().max(100).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  }),
});

export const voidInvoiceSchema = z.object({
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
});

export const generateFromContractSchema = z.object({
  body: z.object({
    contractId: z.string().uuid(),
    periodStart: z.string(),
    periodEnd: z.string(),
    prorate: z.boolean().optional(),
  }).refine(
    (data) => !Number.isNaN(new Date(data.periodStart).getTime()) && !Number.isNaN(new Date(data.periodEnd).getTime()),
    { message: 'periodStart and periodEnd must be valid dates' }
  ),
});

export const batchGenerateSchema = z.object({
  body: z.object({
    periodStart: z.string(),
    periodEnd: z.string(),
    prorate: z.boolean().optional(),
  }).refine(
    (data) => !Number.isNaN(new Date(data.periodStart).getTime()) && !Number.isNaN(new Date(data.periodEnd).getTime()),
    { message: 'periodStart and periodEnd must be valid dates' }
  ),
});
