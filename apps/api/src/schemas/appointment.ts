import { z } from 'zod';

export const appointmentTypeSchema = z.enum([
  'walk_through',
  'inspection',
  'visit',
]);

export const appointmentStatusSchema = z.enum([
  'scheduled',
  'completed',
  'canceled',
  'rescheduled',
  'no_show',
]);

export const createAppointmentSchema = z.object({
  leadId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid(),
  type: appointmentTypeSchema.default('walk_through'),
  status: appointmentStatusSchema.optional().default('scheduled'),
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date(),
  timezone: z.string().min(1).max(50),
  location: z.string().max(1000).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
}).refine(
  (data) => data.scheduledEnd > data.scheduledStart,
  {
    message: 'Scheduled end must be after scheduled start',
    path: ['scheduledEnd'],
  }
).refine(
  (data) =>
    (data.type === 'walk_through' && !!data.leadId && !data.accountId) ||
    (data.type !== 'walk_through' && !!data.accountId && !data.leadId),
  {
    message: 'Walk-through requires a lead. Visits/inspections require an account.',
    path: ['type'],
  }
);

export const updateAppointmentSchema = z.object({
  assignedToUserId: z.string().uuid().optional(),
  status: appointmentStatusSchema.optional(),
  scheduledStart: z.coerce.date().optional(),
  scheduledEnd: z.coerce.date().optional(),
  timezone: z.string().min(1).max(50).optional(),
  location: z.string().max(1000).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
}).refine(
  (data) => {
    if (!data.scheduledStart || !data.scheduledEnd) return true;
    return data.scheduledEnd > data.scheduledStart;
  },
  {
    message: 'Scheduled end must be after scheduled start',
    path: ['scheduledEnd'],
  }
);

export const listAppointmentsQuerySchema = z.object({
  leadId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  assignedToUserId: z.string().uuid().optional(),
  type: appointmentTypeSchema.optional(),
  status: appointmentStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  includePast: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const rescheduleAppointmentSchema = z.object({
  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date(),
  timezone: z.string().min(1).max(50),
  location: z.string().max(1000).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
}).refine(
  (data) => data.scheduledEnd > data.scheduledStart,
  {
    message: 'Scheduled end must be after scheduled start',
    path: ['scheduledEnd'],
  }
);

export const completeAppointmentSchema = z.object({
  facilityId: z.string().uuid(),
  notes: z.string().max(10000).optional().nullable(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type CompleteAppointmentInput = z.infer<typeof completeAppointmentSchema>;
