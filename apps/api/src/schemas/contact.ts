import { z } from 'zod';

const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(255)
  .optional()
  .nullable();
const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format')
  .optional()
  .nullable();

export const createContactSchema = z.object({
  accountId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Name is required').max(255),
  email: emailSchema,
  phone: phoneSchema,
  mobile: phoneSchema,
  title: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
  isBilling: z.boolean().optional().default(false),
  notes: z.string().max(10000).optional().nullable(),
});

export const updateContactSchema = z.object({
  accountId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255).optional(),
  email: emailSchema,
  phone: phoneSchema,
  mobile: phoneSchema,
  title: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  isPrimary: z.boolean().optional(),
  isBilling: z.boolean().optional(),
  notes: z.string().max(10000).optional().nullable(),
});

export const listContactsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  accountId: z.string().uuid().optional(),
  isPrimary: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  isBilling: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;
