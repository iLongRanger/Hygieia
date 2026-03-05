import { z } from 'zod';

export const listPayrollRunsSchema = z.object({
  query: z.object({
    status: z.enum(['draft', 'approved', 'paid']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const generatePayrollSchema = z.object({
  body: z.object({
    periodStart: z.string(),
    periodEnd: z.string(),
  }).refine(
    (data) => !Number.isNaN(new Date(data.periodStart).getTime()) && !Number.isNaN(new Date(data.periodEnd).getTime()),
    { message: 'periodStart and periodEnd must be valid dates' }
  ),
});

export const adjustPayrollEntrySchema = z.object({
  body: z.object({
    grossPay: z.number().min(0).optional(),
    scheduledHours: z.number().min(0).optional(),
    status: z.enum(['valid', 'flagged', 'adjusted']).optional(),
    adjustmentNotes: z.string().max(2000).optional().nullable(),
  }),
});
