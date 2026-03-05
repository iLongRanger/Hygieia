import { z } from 'zod';

export const listExpensesSchema = z.object({
  query: z.object({
    categoryId: z.string().uuid().optional(),
    jobId: z.string().uuid().optional(),
    contractId: z.string().uuid().optional(),
    facilityId: z.string().uuid().optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const createExpenseSchema = z.object({
  body: z.object({
    date: z.string(),
    amount: z.number().positive(),
    description: z.string().min(1).max(2000),
    vendor: z.string().max(200).optional().nullable(),
    categoryId: z.string().uuid(),
    jobId: z.string().uuid().optional().nullable(),
    contractId: z.string().uuid().optional().nullable(),
    facilityId: z.string().uuid().optional().nullable(),
    receiptUrl: z.string().url().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }),
});

export const updateExpenseSchema = z.object({
  body: z.object({
    date: z.string().optional(),
    amount: z.number().positive().optional(),
    description: z.string().min(1).max(2000).optional(),
    vendor: z.string().max(200).optional().nullable(),
    categoryId: z.string().uuid().optional(),
    jobId: z.string().uuid().optional().nullable(),
    contractId: z.string().uuid().optional().nullable(),
    facilityId: z.string().uuid().optional().nullable(),
    receiptUrl: z.string().url().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }),
});

export const listExpenseCategoriesSchema = z.object({
  query: z.object({
    includeInactive: z.enum(['true']).optional(),
  }),
});

export const createExpenseCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});

export const updateExpenseCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});
