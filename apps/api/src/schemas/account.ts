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
const websiteSchema = z
  .string()
  .regex(/^https?:\/\/.+/, 'Website must start with http:// or https://')
  .max(500)
  .optional()
  .nullable();

export const accountTypeSchema = z.enum(['commercial', 'residential']);

export const addressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .optional()
  .nullable();

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  type: accountTypeSchema,
  industry: z.string().max(100).optional().nullable(),
  website: websiteSchema,
  billingEmail: emailSchema,
  billingPhone: phoneSchema,
  billingAddress: addressSchema,
  taxId: z.string().max(50).optional().nullable(),
  paymentTerms: z.string().max(50).optional().default('NET30'),
  creditLimit: z.coerce.number().min(0).optional().nullable(),
  accountManagerId: z.string().uuid().optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: accountTypeSchema.optional(),
  industry: z.string().max(100).optional().nullable(),
  website: websiteSchema,
  billingEmail: emailSchema,
  billingPhone: phoneSchema,
  billingAddress: addressSchema,
  taxId: z.string().max(50).optional().nullable(),
  paymentTerms: z.string().max(50).optional(),
  creditLimit: z.coerce.number().min(0).optional().nullable(),
  accountManagerId: z.string().uuid().optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});

export const listAccountsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(20),
  type: z.preprocess(
    (val) => (val === '' ? undefined : val),
    accountTypeSchema.optional()
  ),
  accountManagerId: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().uuid().optional()
  ),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  includeArchived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
