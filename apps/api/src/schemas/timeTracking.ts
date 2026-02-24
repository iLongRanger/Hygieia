import { z } from 'zod';

export const listTimeEntriesSchema = z.object({
  query: z.object({
    userId: z.string().uuid().optional(),
    jobId: z.string().uuid().optional(),
    contractId: z.string().uuid().optional(),
    facilityId: z.string().uuid().optional(),
    status: z.enum(['active', 'completed', 'edited', 'approved', 'rejected']).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const clockInSchema = z.object({
  body: z.object({
    jobId: z.string().uuid().optional().nullable(),
    contractId: z.string().uuid().optional().nullable(),
    facilityId: z.string().uuid().optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    geoLocation: z.record(z.unknown()).optional().nullable(),
    managerOverride: z.boolean().optional().default(false),
    overrideReason: z.string().max(500).optional().nullable(),
  }),
});

export const clockOutSchema = z.object({
  body: z.object({
    notes: z.string().max(1000).optional().nullable(),
  }),
});

export const manualEntrySchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
    jobId: z.string().uuid().optional().nullable(),
    contractId: z.string().uuid().optional().nullable(),
    facilityId: z.string().uuid().optional().nullable(),
    clockIn: z.string(),
    clockOut: z.string(),
    breakMinutes: z.number().int().min(0).optional(),
    notes: z.string().max(1000).optional().nullable(),
  }),
});

export const editTimeEntrySchema = z.object({
  body: z.object({
    clockIn: z.string().optional(),
    clockOut: z.string().optional().nullable(),
    breakMinutes: z.number().int().min(0).optional(),
    notes: z.string().max(1000).optional().nullable(),
    jobId: z.string().uuid().optional().nullable(),
    facilityId: z.string().uuid().optional().nullable(),
    editReason: z.string().min(1).max(500),
  }),
});

// Timesheets
export const listTimesheetsSchema = z.object({
  query: z.object({
    userId: z.string().uuid().optional(),
    status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const generateTimesheetSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
    periodStart: z.string(),
    periodEnd: z.string(),
  }),
});

export const rejectTimesheetSchema = z.object({
  body: z.object({
    notes: z.string().max(1000).optional(),
  }),
});
