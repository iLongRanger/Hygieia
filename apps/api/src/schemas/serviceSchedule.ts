import { z } from 'zod';

export const scheduleWeekdaySchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

export const proposalScheduleFrequencySchema = z.enum([
  '1x_week',
  '2x_week',
  '3x_week',
  '4x_week',
  '5x_week',
  '7x_week',
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
]);

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use HH:mm (24-hour)');

export const serviceScheduleSchema = z
  .object({
    days: z.array(scheduleWeekdaySchema).min(1).max(7),
    allowedWindowStart: timeSchema,
    allowedWindowEnd: timeSchema,
    windowAnchor: z.enum(['start_day']).default('start_day'),
    timezoneSource: z.enum(['facility']).default('facility'),
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

export function expectedDaysForScheduleFrequency(
  frequency: z.infer<typeof proposalScheduleFrequencySchema>
): number {
  switch (frequency) {
    case '1x_week':
    case 'weekly':
    case 'biweekly':
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
  }
}
