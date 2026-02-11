import { z } from 'zod';

export const accountActivityEntryTypeSchema = z.enum([
  'note',
  'request',
  'complaint',
]);

export const listAccountActivitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const createAccountActivitySchema = z.object({
  entryType: accountActivityEntryTypeSchema.optional().default('note'),
  note: z.string().min(1, 'Note is required').max(10000),
});

export type ListAccountActivitiesQuery = z.infer<
  typeof listAccountActivitiesQuerySchema
>;
export type CreateAccountActivityInput = z.infer<
  typeof createAccountActivitySchema
>;
