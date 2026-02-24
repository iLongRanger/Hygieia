import { z } from 'zod';

export const jobTypeSchema = z.enum(['scheduled_service', 'special_job']);

export const jobListQuerySchema = z.object({
  contractId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  assignedTeamId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  jobType: jobTypeSchema.optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'canceled', 'missed']).optional(),
  dateFrom: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  dateTo: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(parseInt(v, 10), 100) : 25)),
});

export const createJobSchema = z.object({
  contractId: z.string().uuid(),
  facilityId: z.string().uuid(),
  accountId: z.string().uuid(),
  jobType: jobTypeSchema.optional().default('special_job'),
  assignedTeamId: z.string().uuid().nullable().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  scheduledDate: z.string().transform((v) => new Date(v)),
  scheduledStartTime: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
  scheduledEndTime: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
  estimatedHours: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.assignedTeamId && data.assignedToUserId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Assign either a subcontractor team or an internal employee, not both',
      path: ['assignedTeamId'],
    });
  }
});

export const updateJobSchema = z.object({
  assignedTeamId: z.string().uuid().nullable().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  scheduledDate: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  scheduledStartTime: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
  scheduledEndTime: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
  estimatedHours: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.assignedTeamId && data.assignedToUserId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Assign either a subcontractor team or an internal employee, not both',
      path: ['assignedTeamId'],
    });
  }
});

export const completeJobSchema = z.object({
  completionNotes: z.string().nullable().optional(),
  actualHours: z.number().positive().nullable().optional(),
});

export const cancelJobSchema = z.object({
  reason: z.string().nullable().optional(),
});

export const assignJobSchema = z.object({
  assignedTeamId: z.string().uuid().nullable().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.assignedTeamId && data.assignedToUserId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Assign either a subcontractor team or an internal employee, not both',
      path: ['assignedTeamId'],
    });
  }
});

export const startJobSchema = z.object({
  managerOverride: z.boolean().optional().default(false),
  overrideReason: z.string().max(500).nullable().optional(),
});

export const generateJobsSchema = z.object({
  contractId: z.string().uuid(),
  dateFrom: z.string().transform((v) => new Date(v)),
  dateTo: z.string().transform((v) => new Date(v)),
  assignedTeamId: z.string().uuid().nullable().optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.assignedTeamId && data.assignedToUserId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Assign either a subcontractor team or an internal employee, not both',
      path: ['assignedTeamId'],
    });
  }
});

export const createJobTaskSchema = z.object({
  facilityTaskId: z.string().uuid().nullable().optional(),
  taskName: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
});

export const updateJobTaskSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional(),
  actualMinutes: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const createJobNoteSchema = z.object({
  noteType: z.enum(['general', 'issue', 'photo']).optional().default('general'),
  content: z.string().min(1),
  photoUrl: z.string().nullable().optional(),
});
