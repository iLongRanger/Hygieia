import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  includeRead: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export const markNotificationReadSchema = z.object({
  read: z.boolean().optional().default(true),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
