import { z } from 'zod';

const emailSchema = z.string().email('Invalid email format').max(255);
const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format')
  .optional()
  .nullable();

export const userRoleSchema = z.enum(['owner', 'admin', 'manager', 'cleaner']);

export const createUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  fullName: z.string().min(1, 'Full name is required').max(255),
  phone: phoneSchema,
  avatarUrl: z.string().url().optional().nullable(),
  status: z
    .enum(['active', 'disabled', 'pending'])
    .optional()
    .default('active'),
  role: userRoleSchema.optional().default('cleaner'),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  phone: phoneSchema,
  avatarUrl: z.string().url().optional().nullable(),
  status: z.enum(['active', 'disabled', 'pending']).optional(),
  preferences: z.record(z.unknown()).optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(['active', 'disabled', 'pending']).optional(),
  role: userRoleSchema.optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'email', 'fullName', 'status'])
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const assignRoleSchema = z.object({
  role: userRoleSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
