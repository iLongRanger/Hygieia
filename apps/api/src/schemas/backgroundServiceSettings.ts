import { z } from 'zod';

export const backgroundServiceKeySchema = z.enum([
  'reminders',
  'recurring_jobs_autogen',
  'job_alerts',
  'contract_assignment_overrides',
]);

export const updateBackgroundServiceSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    intervalMs: z.coerce.number().int().min(60_000).optional(),
  })
  .refine((value) => value.enabled !== undefined || value.intervalMs !== undefined, {
    message: 'At least one of enabled or intervalMs is required',
  });

export type BackgroundServiceKey = z.infer<typeof backgroundServiceKeySchema>;
export type UpdateBackgroundServiceSettingsInput = z.infer<
  typeof updateBackgroundServiceSettingsSchema
>;
